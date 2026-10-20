import type { CommentView, DiscussionView } from '@neuma/shared';
import type { BlockPageLocation } from '../../../common/types/block-page.types';
import { UNKNOWN_AUTHOR_NAME } from '../constants/comments.constants';
import { canDeleteComment, canEditComment } from '../domain/comment.domain';
import type { CommentActor } from '../domain/comment.domain.types';
import type { CommentRecord, DiscussionWithComments } from '../types/comment.types';

export const toCommentView = (
  comment: CommentRecord,
  names: ReadonlyMap<string, string>,
  viewer: CommentActor,
  canComment: boolean,
): CommentView => ({
  authorId: comment.authorId,
  authorName: names.get(comment.authorId) ?? UNKNOWN_AUTHOR_NAME,
  body: comment.body,
  canDelete: canDeleteComment(viewer, comment) && (canComment || comment.authorId !== viewer.userId),
  canEdit: canComment && canEditComment(viewer, comment),
  createdAt: comment.createdAt.toISOString(),
  discussionId: comment.discussionId,
  editedAt: comment.editedAt?.toISOString() ?? null,
  id: comment.id,
  isDeleted: comment.deletedAt !== null,
});

export const toDiscussionView = (
  { comments, discussion }: DiscussionWithComments,
  pageId: string,
  names: ReadonlyMap<string, string>,
  viewer: CommentActor,
  canComment: boolean,
): DiscussionView => ({
  anchorMarkId: discussion.anchorMarkId,
  blockId: discussion.blockId,
  canComment,
  comments: comments.map((comment) => toCommentView(comment, names, viewer, canComment)),
  createdAt: discussion.createdAt.toISOString(),
  createdById: discussion.createdById,
  id: discussion.id,
  pageId,
  quote: discussion.quote,
  resolvedAt: discussion.resolvedAt?.toISOString() ?? null,
  resolvedById: discussion.resolvedById,
});

export const listUserIdsOf = (items: readonly DiscussionWithComments[]): string[] =>
  items.flatMap(({ comments }) => comments.map((comment) => comment.authorId));

/** A block whose page cannot be found (removed meanwhile) is shown under its own id, so a jump still has a target. */
export const readPageIdOf = (blockId: string, locations: ReadonlyMap<string, BlockPageLocation>): string =>
  locations.get(blockId)?.pageId ?? blockId;
