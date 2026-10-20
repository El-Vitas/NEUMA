import {
  type BlockRichText,
  type BlockRole,
  blockRichTextSchema,
  COMMENT_MENTIONS_MAX,
  COMMENT_TEXT_MAX_LENGTH,
  canEditBlock,
  canManageWorkspace,
  canReadBlock,
  DISCUSSION_QUOTE_MAX_LENGTH,
  extractPlainText,
  isCommentBodyEmpty,
  listMentionedUserIds,
  Result,
} from '@neuma/shared';
import type {
  CommentActor,
  CommentNotificationInput,
  CommentOwnership,
  PlannedCommentNotification,
} from './comment.domain.types';
import { CommentBodyInvalidError } from './comment.error';

/** Commenting is writing to the block, as it was when comments were kept inside it. */
export const canCommentOnBlock = (role: BlockRole): boolean => canEditBlock(role);

export const canSeeDiscussions = (role: BlockRole): boolean => canReadBlock(role);

export const canEditComment = (actor: CommentActor, comment: CommentOwnership): boolean =>
  comment.deletedAt === null && comment.authorId === actor.userId;

/** A workspace admin moderates: they delete any comment, but never edit what another person wrote. */
export const canDeleteComment = (actor: CommentActor, comment: CommentOwnership): boolean =>
  comment.deletedAt === null && (comment.authorId === actor.userId || canManageWorkspace(actor.role));

export const parseCommentBody = (value: unknown): Result<BlockRichText, CommentBodyInvalidError> => {
  const parsed = blockRichTextSchema.safeParse(value);
  if (!parsed.success) return Result.fail(new CommentBodyInvalidError('it is not rich text'));
  const body = parsed.data;
  if (isCommentBodyEmpty(body)) return Result.fail(new CommentBodyInvalidError('it is empty'));
  if (extractPlainText(body).length > COMMENT_TEXT_MAX_LENGTH) {
    return Result.fail(new CommentBodyInvalidError(`it is longer than ${String(COMMENT_TEXT_MAX_LENGTH)} characters`));
  }
  if (listMentionedUserIds(body).length > COMMENT_MENTIONS_MAX) {
    return Result.fail(new CommentBodyInvalidError(`it names more than ${String(COMMENT_MENTIONS_MAX)} people`));
  }
  return Result.ok(body);
};

/** A thread about a stretch of text keeps what was quoted; a blank quote means the whole block. */
export const readDiscussionQuote = (quote: string | undefined): string | null => {
  const trimmed = quote?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed.slice(0, DISCUSSION_QUOTE_MAX_LENGTH);
};

const isRecipient = (userId: string, input: CommentNotificationInput): boolean =>
  userId !== input.actorId && input.readableUserIds.has(userId);

/**
 * Who is told about a comment. A mention beats a reply, so a person who is both gets one notification, and nobody
 * is told about a block they cannot read or about their own comment.
 */
export const planCommentNotifications = (input: CommentNotificationInput): PlannedCommentNotification[] => {
  const mentioned = input.mentionedUserIds.filter((userId) => isRecipient(userId, input));
  const mentionedSet = new Set(mentioned);
  const replied = input.participantUserIds.filter((userId) => isRecipient(userId, input) && !mentionedSet.has(userId));
  return [
    ...mentioned.map((recipientId) => ({ kind: 'MENTION' as const, recipientId })),
    ...[...new Set(replied)].map((recipientId) => ({ kind: 'REPLY' as const, recipientId })),
  ];
};
