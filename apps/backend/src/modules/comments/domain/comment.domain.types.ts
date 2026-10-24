import type { UserRole } from '@neuma/shared';

export interface CommentActor {
  readonly role: UserRole;
  readonly userId: string;
}

/** The part of a stored comment the rules about who may touch it need. */
export interface CommentOwnership {
  readonly authorId: string;
  readonly deletedAt: Date | null;
}

export type CommentNotificationKind = 'MENTION' | 'REPLY';

export interface PlannedCommentNotification {
  readonly kind: CommentNotificationKind;
  readonly recipientId: string;
}

export interface CommentNotificationInput {
  readonly actorId: string;
  readonly mentionedUserIds: readonly string[];
  /** People already in the thread; empty when the comment opens it. */
  readonly participantUserIds: readonly string[];
  readonly readableUserIds: ReadonlySet<string>;
}
