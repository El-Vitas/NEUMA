import { Inject, Injectable } from '@nestjs/common';
import {
  type BlockRichText,
  DISCUSSIONS_PAGE_SIZE_DEFAULT,
  DISCUSSIONS_PAGE_SIZE_MAX,
  type DiscussionPageView,
  type DiscussionView,
  listMentionedUserIds,
  Result,
} from '@neuma/shared';
import type { DomainError } from '../../common/domain/domain.error';
import { BlockAccessRepository } from '../../common/infrastructure/persistence/block-access.repository';
import { BlockAudienceRepository } from '../../common/infrastructure/persistence/block-audience.repository';
import { BlockPageLocator } from '../../common/infrastructure/persistence/block-page.locator';
import type { BlockAccessViewer } from '../../common/types/block-access.types';
import { decodeKeysetCursor, encodeKeysetCursor } from '../../common/utils/keyset-cursor.utils';
import { COMMENT_REPOSITORY } from './constants/comments.constants';
import {
  canCommentOnBlock,
  canDeleteComment,
  canEditComment,
  canSeeDiscussions,
  parseCommentBody,
  planCommentNotifications,
  readDiscussionQuote,
} from './domain/comment.domain';
import type { PlannedCommentNotification } from './domain/comment.domain.types';
import {
  CommentForbiddenError,
  CommentNotAllowedError,
  CommentNotFoundError,
  DiscussionNotFoundError,
} from './domain/comment.error';
import type {
  CommentRecord,
  CommentRepositoryContract,
  DiscussionWithComments,
  OpenDiscussionInput,
  PageDiscussionsRequest,
  RemovedComment,
  StoredComment,
} from './types/comment.types';
import { listUserIdsOf, readPageIdOf, toCommentView, toDiscussionView } from './utils/comment.view.utils';

/** Who may do what with a discussion is decided by the block it is about, never by the discussion itself. */
@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepositoryContract,
    private readonly blockAccess: BlockAccessRepository,
    private readonly audience: BlockAudienceRepository,
    private readonly pageLocator: BlockPageLocator,
  ) {}

  async openDiscussion(
    viewer: BlockAccessViewer,
    blockId: string,
    input: OpenDiscussionInput,
  ): Promise<Result<DiscussionView, DomainError>> {
    const body = parseCommentBody(input.body);
    if (body.isFail()) return Result.fail(body.getError());
    const allowed = await this.requireCommenter(viewer, blockId);
    if (allowed.isFail()) return Result.fail(allowed.getError());
    const notifications = await this.planNotifications(viewer, blockId, body.getValue(), []);
    const stored = await this.comments.openDiscussion({
      authorId: viewer.userId,
      blockId,
      body: body.getValue(),
      notifications,
      quote: readDiscussionQuote(input.quote),
      spaceId: allowed.getValue(),
    });
    return Result.ok(await this.toView(viewer, stored));
  }

  async reply(
    viewer: BlockAccessViewer,
    discussionId: string,
    rawBody: unknown,
  ): Promise<Result<DiscussionView, DomainError>> {
    const body = parseCommentBody(rawBody);
    if (body.isFail()) return Result.fail(body.getError());
    const found = await this.requireDiscussion(viewer, discussionId);
    if (found.isFail()) return Result.fail(found.getError());
    const { discussion } = found.getValue();
    const allowed = await this.requireCommenter(viewer, discussion.blockId);
    if (allowed.isFail()) return Result.fail(allowed.getError());
    const participants = await this.comments.listParticipantIds(discussionId);
    const notifications = await this.planNotifications(viewer, discussion.blockId, body.getValue(), participants);
    await this.comments.addReply({ authorId: viewer.userId, body: body.getValue(), discussion, notifications });
    return Result.ok(await this.readDiscussionView(viewer, discussionId));
  }

  async edit(
    viewer: BlockAccessViewer,
    commentId: string,
    rawBody: unknown,
  ): Promise<Result<ReturnType<typeof toCommentView>, DomainError>> {
    const body = parseCommentBody(rawBody);
    if (body.isFail()) return Result.fail(body.getError());
    const found = await this.requireComment(viewer, commentId);
    if (found.isFail()) return Result.fail(found.getError());
    const { comment, discussion } = found.getValue();
    if (!canEditComment(viewer, comment)) return Result.fail(new CommentForbiddenError());
    const allowed = await this.requireCommenter(viewer, discussion.blockId);
    if (allowed.isFail()) return Result.fail(allowed.getError());
    const notifications = await this.planNewMentions(viewer, discussion.blockId, comment, body.getValue());
    const edited = await this.comments.editComment({ body: body.getValue(), comment, discussion, notifications });
    return Result.ok(toCommentView(edited, await this.comments.readUserNames([edited.authorId]), viewer, true));
  }

  async remove(viewer: BlockAccessViewer, commentId: string): Promise<Result<RemovedComment, DomainError>> {
    const found = await this.requireComment(viewer, commentId);
    if (found.isFail()) return Result.fail(found.getError());
    const stored = found.getValue();
    if (!canDeleteComment(viewer, stored.comment)) return Result.fail(new CommentForbiddenError());
    if (stored.comment.authorId === viewer.userId) {
      const allowed = await this.requireCommenter(viewer, stored.discussion.blockId);
      if (allowed.isFail()) return Result.fail(allowed.getError());
    }
    const outcome = await this.comments.deleteComment(stored);
    return Result.ok({
      discussionId: stored.discussion.id,
      discussionRemoved: outcome === 'discussion-removed',
      wasAnchored: stored.discussion.anchorMarkId !== null,
    });
  }

  async locateComment(
    viewer: BlockAccessViewer,
    commentId: string,
  ): Promise<Result<{ readonly blockId: string; readonly pageId: string }, DomainError>> {
    const found = await this.requireComment(viewer, commentId);
    if (found.isFail()) return Result.fail(found.getError());
    const { blockId } = found.getValue().discussion;
    const locations = await this.pageLocator.locate([blockId]);
    return Result.ok({ blockId, pageId: readPageIdOf(blockId, locations) });
  }

  async resolve(viewer: BlockAccessViewer, discussionId: string): Promise<Result<DiscussionView, DomainError>> {
    return this.changeResolution(viewer, discussionId, viewer.userId);
  }

  async reopen(viewer: BlockAccessViewer, discussionId: string): Promise<Result<DiscussionView, DomainError>> {
    return this.changeResolution(viewer, discussionId, null);
  }

  async getDiscussion(viewer: BlockAccessViewer, discussionId: string): Promise<Result<DiscussionView, DomainError>> {
    const found = await this.requireDiscussion(viewer, discussionId);
    if (found.isFail()) return Result.fail(found.getError());
    return Result.ok(await this.toView(viewer, found.getValue()));
  }

  async listPageDiscussions(
    viewer: BlockAccessViewer,
    pageId: string,
    request: PageDiscussionsRequest,
  ): Promise<Result<DiscussionPageView, DomainError>> {
    const readable = await this.blockAccess.findReadableBlockIds([pageId], viewer);
    if (!readable.has(pageId)) return Result.fail(new DiscussionNotFoundError());
    const limit = Math.min(request.limit ?? DISCUSSIONS_PAGE_SIZE_DEFAULT, DISCUSSIONS_PAGE_SIZE_MAX);
    const batch = await this.comments.listPageDiscussions({
      after: decodeKeysetCursor(request.cursor),
      includeResolved: request.includeResolved,
      limit,
      pageId,
      viewer,
    });
    const views = await this.toViews(viewer, batch.discussions);
    const last = batch.discussions.at(-1)?.discussion;
    return Result.ok({
      discussions: views,
      nextCursor: batch.hasMore && last !== undefined ? encodeKeysetCursor({ at: last.createdAt, id: last.id }) : null,
    });
  }

  private async changeResolution(
    viewer: BlockAccessViewer,
    discussionId: string,
    resolvedById: string | null,
  ): Promise<Result<DiscussionView, DomainError>> {
    const found = await this.requireDiscussion(viewer, discussionId);
    if (found.isFail()) return Result.fail(found.getError());
    const { discussion } = found.getValue();
    const allowed = await this.requireCommenter(viewer, discussion.blockId);
    if (allowed.isFail()) return Result.fail(allowed.getError());
    return Result.ok(await this.toView(viewer, await this.comments.setResolved(discussion, resolvedById)));
  }

  /** Reads the block as the viewer holds it: a missing block and an unreadable one answer the same. */
  private async requireReader(
    viewer: BlockAccessViewer,
    blockId: string,
  ): Promise<Result<{ readonly canComment: boolean; readonly spaceId: string }, DomainError>> {
    const standing = await this.blockAccess.findStanding(blockId, viewer);
    if (standing === null || !canSeeDiscussions(standing.role)) return Result.fail(new DiscussionNotFoundError());
    return Result.ok({ canComment: canCommentOnBlock(standing.role), spaceId: standing.spaceId });
  }

  /** The space of the block, when the viewer may write to it. */
  private async requireCommenter(viewer: BlockAccessViewer, blockId: string): Promise<Result<string, DomainError>> {
    const reader = await this.requireReader(viewer, blockId);
    if (reader.isFail()) return Result.fail(reader.getError());
    return reader.getValue().canComment
      ? Result.ok(reader.getValue().spaceId)
      : Result.fail(new CommentNotAllowedError());
  }

  private async requireDiscussion(
    viewer: BlockAccessViewer,
    discussionId: string,
  ): Promise<Result<DiscussionWithComments, DomainError>> {
    const found = await this.comments.findDiscussion(discussionId);
    if (found === null) return Result.fail(new DiscussionNotFoundError());
    const reader = await this.requireReader(viewer, found.discussion.blockId);
    return reader.isFail() ? Result.fail(reader.getError()) : Result.ok(found);
  }

  private async requireComment(
    viewer: BlockAccessViewer,
    commentId: string,
  ): Promise<Result<StoredComment, DomainError>> {
    const found = await this.comments.findComment(commentId);
    if (found === null) return Result.fail(new CommentNotFoundError());
    const reader = await this.requireReader(viewer, found.discussion.blockId);
    return reader.isFail() ? Result.fail(new CommentNotFoundError()) : Result.ok(found);
  }

  private async planNotifications(
    viewer: BlockAccessViewer,
    blockId: string,
    body: BlockRichText,
    participantUserIds: readonly string[],
  ): Promise<PlannedCommentNotification[]> {
    const mentionedUserIds = listMentionedUserIds(body);
    const candidates = [...new Set([...mentionedUserIds, ...participantUserIds])];
    const readableUserIds = await this.audience.findReadersOf(blockId, candidates, viewer.workspaceId);
    return planCommentNotifications({ actorId: viewer.userId, mentionedUserIds, participantUserIds, readableUserIds });
  }

  /** An edit tells only the people it names for the first time; whoever was already named has been told. */
  private async planNewMentions(
    viewer: BlockAccessViewer,
    blockId: string,
    previous: CommentRecord,
    body: BlockRichText,
  ): Promise<PlannedCommentNotification[]> {
    const alreadyNamed = new Set(listMentionedUserIds(previous.body));
    const fresh = listMentionedUserIds(body).filter((userId) => !alreadyNamed.has(userId));
    const readableUserIds = await this.audience.findReadersOf(blockId, fresh, viewer.workspaceId);
    return planCommentNotifications({
      actorId: viewer.userId,
      mentionedUserIds: fresh,
      participantUserIds: [],
      readableUserIds,
    });
  }

  private async readDiscussionView(viewer: BlockAccessViewer, discussionId: string): Promise<DiscussionView> {
    const stored = await this.comments.findDiscussion(discussionId);
    if (stored === null) throw new Error(`Discussion ${discussionId} no longer exists`);
    return this.toView(viewer, stored);
  }

  private async toView(viewer: BlockAccessViewer, stored: DiscussionWithComments): Promise<DiscussionView> {
    const [view] = await this.toViews(viewer, [stored]);
    if (view === undefined) throw new Error(`Discussion ${stored.discussion.id} produced no view`);
    return view;
  }

  private async toViews(
    viewer: BlockAccessViewer,
    items: readonly DiscussionWithComments[],
  ): Promise<DiscussionView[]> {
    const blockIds = [...new Set(items.map(({ discussion }) => discussion.blockId))];
    const [locations, names, commentableBlockIds] = await Promise.all([
      this.pageLocator.locate(blockIds),
      this.comments.readUserNames(listUserIdsOf(items)),
      this.listCommentableBlockIds(viewer, blockIds),
    ]);
    return items.map((item) =>
      toDiscussionView(
        item,
        readPageIdOf(item.discussion.blockId, locations),
        names,
        viewer,
        commentableBlockIds.has(item.discussion.blockId),
      ),
    );
  }

  /** The blocks, among these, where the viewer may write comments. One lookup per block, all at once. */
  private async listCommentableBlockIds(
    viewer: BlockAccessViewer,
    blockIds: readonly string[],
  ): Promise<ReadonlySet<string>> {
    const verdicts = await Promise.all(
      blockIds.map(async (blockId) => {
        const standing = await this.blockAccess.findStanding(blockId, viewer);
        return standing !== null && canCommentOnBlock(standing.role) ? blockId : null;
      }),
    );
    return new Set(verdicts.flatMap((verdict) => (verdict === null ? [] : [verdict])));
  }
}
