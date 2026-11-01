import { Injectable } from '@nestjs/common';
import { and, type NeumaTransaction, or } from '@neuma/db';
import { BLOCK_TYPE, listMentionedUserIds } from '@neuma/shared';
import { BlockAccessRepository } from '../../../../common/infrastructure/persistence/block-access.repository';
import { NotificationWriter } from '../../../../common/infrastructure/persistence/notification.writer';
import type { NotificationDraft } from '../../../../common/types/comment-events.types';
import { requireRow } from '../../../../common/utils/required-row.utils';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  COMMENT_BATCH_ROUNDS_MAX,
  COMMENT_PAGE_TREE_DEPTH_MAX,
  COMMENT_SCAN_FACTOR,
} from '../../constants/comments.constants';
import type { PlannedCommentNotification } from '../../domain/comment.domain.types';
import { commentBodySchema, storedJsonSchema } from '../../schemas/comment.row.schemas';
import type {
  CommentEdit,
  CommentRecord,
  CommentRepositoryContract,
  CommentRow,
  DeletionOutcome,
  DiscussionRecord,
  DiscussionRow,
  DiscussionsBatch,
  DiscussionWithComments,
  NewDiscussion,
  NewReply,
  PageDiscussionsQuery,
  StoredComment,
} from '../../types/comment.types';

const toDiscussionRecord = (row: DiscussionRow): DiscussionRecord => ({
  anchorMarkId: row.anchorMarkId,
  blockId: row.blockId,
  createdAt: row.createdAt,
  createdById: row.createdById,
  id: row.id,
  quote: row.quote,
  resolvedAt: row.resolvedAt,
  resolvedById: row.resolvedById,
  spaceId: row.spaceId,
});

const toCommentRecord = (row: CommentRow): CommentRecord => ({
  authorId: row.authorId,
  body: commentBodySchema.parse(row.body),
  createdAt: row.createdAt,
  deletedAt: row.deletedAt,
  discussionId: row.discussionId,
  editedAt: row.editedAt,
  id: row.id,
});

const toDrafts = (
  plan: readonly PlannedCommentNotification[],
  source: { actorId: string; blockId: string; commentId: string; discussionId: string },
): NotificationDraft[] =>
  plan.map((planned) => ({
    actorId: source.actorId,
    blockId: source.blockId,
    commentId: source.commentId,
    discussionId: source.discussionId,
    kind: planned.kind,
    recipientId: planned.recipientId,
  }));

@Injectable()
export class CommentRepository implements CommentRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockAccess: BlockAccessRepository,
    private readonly notificationWriter: NotificationWriter,
  ) {}

  async openDiscussion(draft: NewDiscussion): Promise<DiscussionWithComments> {
    return this.prisma.transaction(async (transaction) => {
      const created = await transaction.orm.public.Discussion.create({
        blockId: draft.blockId,
        createdAt: new Date(),
        createdById: draft.authorId,
        quote: draft.quote,
        spaceId: draft.spaceId,
      });
      const discussion = await this.anchorToOwnId(transaction, created, draft.quote !== null);
      const comment = await this.insertComment(transaction, discussion.id, draft.authorId, draft.body);
      await this.notificationWriter.createMany(
        toDrafts(draft.notifications, {
          actorId: draft.authorId,
          blockId: draft.blockId,
          commentId: comment.id,
          discussionId: discussion.id,
        }),
        transaction,
      );
      await this.announce(transaction, discussion);
      return { comments: [comment], discussion: toDiscussionRecord(discussion) };
    });
  }

  async addReply(reply: NewReply): Promise<CommentRecord> {
    return this.prisma.transaction(async (transaction) => {
      const comment = await this.insertComment(transaction, reply.discussion.id, reply.authorId, reply.body);
      await this.notificationWriter.createMany(
        toDrafts(reply.notifications, {
          actorId: reply.authorId,
          blockId: reply.discussion.blockId,
          commentId: comment.id,
          discussionId: reply.discussion.id,
        }),
        transaction,
      );
      await this.announce(transaction, reply.discussion);
      return comment;
    });
  }

  async editComment(edit: CommentEdit): Promise<CommentRecord> {
    return this.prisma.transaction(async (transaction) => {
      const updated = requireRow(
        await transaction.orm.public.Comment.where({ id: edit.comment.id }).update({
          body: storedJsonSchema.parse(edit.body),
          editedAt: new Date(),
        }),
        `Comment ${edit.comment.id}`,
      );
      await this.notificationWriter.createMany(
        toDrafts(edit.notifications, {
          actorId: edit.comment.authorId,
          blockId: edit.discussion.blockId,
          commentId: edit.comment.id,
          discussionId: edit.discussion.id,
        }),
        transaction,
      );
      await this.announce(transaction, edit.discussion);
      return toCommentRecord(updated);
    });
  }

  async deleteComment({ comment, discussion }: StoredComment): Promise<DeletionOutcome> {
    return this.prisma.transaction(async (transaction) => {
      const { Comment, Discussion, Notification } = transaction.orm.public;
      await Comment.where({ id: comment.id }).update({ body: [], deletedAt: new Date() });
      await Notification.where({ commentId: comment.id }).deleteAndCount();
      const remaining = await Comment.select('id')
        .where({ discussionId: discussion.id })
        .where((entry) => entry.deletedAt.isNull())
        .first();
      if (remaining === null) await Discussion.where({ id: discussion.id }).deleteAndCount();
      await this.announce(transaction, discussion);
      return remaining === null ? 'discussion-removed' : 'comment-removed';
    });
  }

  async setResolved(discussion: DiscussionRecord, resolvedById: string | null): Promise<DiscussionWithComments> {
    return this.prisma.transaction(async (transaction) => {
      const updated = requireRow(
        await transaction.orm.public.Discussion.where({ id: discussion.id }).update({
          resolvedAt: resolvedById === null ? null : new Date(),
          resolvedById,
        }),
        `Discussion ${discussion.id}`,
      );
      await this.announce(transaction, updated);
      const comments = await transaction.orm.public.Comment.where({ discussionId: discussion.id })
        .orderBy([(entry) => entry.createdAt.asc(), (entry) => entry.id.asc()])
        .all();
      return { comments: comments.map(toCommentRecord), discussion: toDiscussionRecord(updated) };
    });
  }

  async findDiscussion(discussionId: string): Promise<DiscussionWithComments | null> {
    const discussion = await this.prisma.models.Discussion.where({ id: discussionId }).first();
    if (discussion === null) return null;
    const comments = await this.listComments([discussionId]);
    return { comments: comments.get(discussionId) ?? [], discussion: toDiscussionRecord(discussion) };
  }

  async findComment(commentId: string): Promise<StoredComment | null> {
    const comment = await this.prisma.models.Comment.where({ id: commentId }).first();
    if (comment === null) return null;
    const discussion = await this.prisma.models.Discussion.where({ id: comment.discussionId }).first();
    if (discussion === null) return null;
    return { comment: toCommentRecord(comment), discussion: toDiscussionRecord(discussion) };
  }

  async listParticipantIds(discussionId: string): Promise<readonly string[]> {
    const comments = await this.prisma.models.Comment.where({ discussionId })
      .where((entry) => entry.deletedAt.isNull())
      .all();
    return [
      ...new Set(
        comments.flatMap((comment) => {
          const record = toCommentRecord(comment);
          return [record.authorId, ...listMentionedUserIds(record.body)];
        }),
      ),
    ];
  }

  async listPageDiscussions(query: PageDiscussionsQuery): Promise<DiscussionsBatch> {
    const blockIds = await this.listPageBlockIds(query.pageId);
    const readable = await this.collectReadable(blockIds, query);
    const shown = readable.slice(0, query.limit);
    const comments = await this.listComments(shown.map((discussion) => discussion.id));
    return {
      discussions: shown.map((discussion) => ({
        comments: comments.get(discussion.id) ?? [],
        discussion: toDiscussionRecord(discussion),
      })),
      hasMore: readable.length > query.limit,
    };
  }

  async readUserNames(userIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (userIds.length === 0) return new Map();
    const users = await this.prisma.models.User.select('id', 'name')
      .where((user) => user.id.in([...new Set(userIds)]))
      .all();
    return new Map(users.map((user) => [user.id, user.name]));
  }

  /** The inline mark of a quoted stretch carries the id of its discussion, which the database only chose just now. */
  private async anchorToOwnId(
    transaction: NeumaTransaction,
    discussion: DiscussionRow,
    isAnchored: boolean,
  ): Promise<DiscussionRow> {
    if (!isAnchored) return discussion;
    return requireRow(
      await transaction.orm.public.Discussion.where({ id: discussion.id }).update({ anchorMarkId: discussion.id }),
      `Discussion ${discussion.id}`,
    );
  }

  private async insertComment(
    transaction: NeumaTransaction,
    discussionId: string,
    authorId: string,
    body: unknown,
  ): Promise<CommentRecord> {
    const created = await transaction.orm.public.Comment.create({
      authorId,
      body: storedJsonSchema.parse(body),
      createdAt: new Date(),
      discussionId,
    });
    return toCommentRecord(created);
  }

  private async announce(
    transaction: NeumaTransaction,
    discussion: Pick<DiscussionRow, 'blockId' | 'id' | 'spaceId'>,
  ): Promise<void> {
    await this.notificationWriter.announceDiscussion(
      { blockId: discussion.blockId, discussionId: discussion.id, spaceId: discussion.spaceId },
      transaction,
    );
  }

  /** The page block and everything below it that is not another page: those are the blocks this page shows. */
  private async listPageBlockIds(pageId: string): Promise<string[]> {
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "tree" AS (
        SELECT "id", 0 AS "depth" FROM "Block" WHERE "id" = ${pageId}
        UNION ALL
        SELECT "child"."id", "tree"."depth" + 1
        FROM "Block" AS "child"
        INNER JOIN "tree" ON "child"."parentId" = "tree"."id"
        WHERE "child"."type" <> ${BLOCK_TYPE.page} AND "tree"."depth" < ${COMMENT_PAGE_TREE_DEPTH_MAX}
      )
      SELECT "id" FROM "tree"
    `
        .returnsRow({ id: columns.id })
        .build(),
    );
    return rows.map((row) => row.id);
  }

  /**
   * Reads discussions in order and keeps those whose block the viewer can read, until there is one more than the
   * page needs. A page full of hidden discussions is skipped in rounds, never returned and never counted.
   */
  private async collectReadable(blockIds: readonly string[], query: PageDiscussionsQuery): Promise<DiscussionRow[]> {
    if (blockIds.length === 0) return [];
    const size = query.limit * COMMENT_SCAN_FACTOR;
    const kept: DiscussionRow[] = [];
    let after = query.after;
    for (let round = 0; round < COMMENT_BATCH_ROUNDS_MAX && kept.length <= query.limit; round += 1) {
      const candidates = await this.readCandidates(blockIds, query.includeResolved, after, size);
      if (candidates.length === 0) break;
      const readable = await this.blockAccess.findReadableBlockIds(
        candidates.map((candidate) => candidate.blockId),
        query.viewer,
      );
      kept.push(...candidates.filter((candidate) => readable.has(candidate.blockId)));
      const last = candidates.at(-1);
      if (candidates.length < size || last === undefined) break;
      after = { at: last.createdAt, id: last.id };
    }
    return kept.slice(0, query.limit + 1);
  }

  private async readCandidates(
    blockIds: readonly string[],
    includeResolved: boolean,
    after: PageDiscussionsQuery['after'],
    size: number,
  ): Promise<DiscussionRow[]> {
    return this.prisma.models.Discussion.where((discussion) => discussion.blockId.in([...blockIds]))
      .where((discussion) => (includeResolved ? discussion.id.isNotNull() : discussion.resolvedAt.isNull()))
      .where((discussion) =>
        after === null
          ? discussion.id.isNotNull()
          : or(discussion.createdAt.gt(after.at), and(discussion.createdAt.eq(after.at), discussion.id.gt(after.id))),
      )
      .orderBy([(discussion) => discussion.createdAt.asc(), (discussion) => discussion.id.asc()])
      .limit(size)
      .all();
  }

  private async listComments(discussionIds: readonly string[]): Promise<ReadonlyMap<string, CommentRecord[]>> {
    const grouped = new Map<string, CommentRecord[]>();
    if (discussionIds.length === 0) return grouped;
    const rows = await this.prisma.models.Comment.where((comment) => comment.discussionId.in([...discussionIds]))
      .orderBy([(comment) => comment.createdAt.asc(), (comment) => comment.id.asc()])
      .all();
    for (const row of rows) {
      const comment = toCommentRecord(row);
      grouped.set(comment.discussionId, [...(grouped.get(comment.discussionId) ?? []), comment]);
    }
    return grouped;
  }
}
