import type { NotificationKind } from '@neuma/shared';
import type { COMMENT_EVENT_KIND } from '../constants/comment-events.constants';

/** A discussion of a block changed: whoever has the page open and can read the block reads it again. */
export interface DiscussionChangedEvent {
  readonly blockId: string;
  readonly discussionId: string;
  readonly kind: typeof COMMENT_EVENT_KIND.discussion;
  readonly spaceId: string;
}

/** A notification was created for one person. It carries only ids; the content is read over HTTP, access checked. */
export interface NotificationCreatedEvent {
  readonly kind: typeof COMMENT_EVENT_KIND.notification;
  readonly notificationId: string;
  readonly recipientId: string;
}

export type CommentEvent = DiscussionChangedEvent | NotificationCreatedEvent;

export interface NotificationDraft {
  readonly actorId: string;
  readonly blockId: string;
  readonly commentId: string | null;
  readonly discussionId: string | null;
  readonly kind: NotificationKind;
  readonly recipientId: string;
}
