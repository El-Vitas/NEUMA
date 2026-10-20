import type { BlockRichText } from '../block/block-content.types.js';
import type { NOTIFICATION_KIND_VALUES } from './discussion.constants.js';

export type NotificationKind = (typeof NOTIFICATION_KIND_VALUES)[number];

/** One message of a discussion. A deleted one keeps its place with an empty body. */
export interface CommentView {
  readonly authorId: string;
  readonly authorName: string;
  readonly body: BlockRichText;
  /** What the reader of the view may do, so a screen never repeats the rules. */
  readonly canDelete: boolean;
  readonly canEdit: boolean;
  readonly createdAt: string;
  readonly discussionId: string;
  readonly editedAt: string | null;
  readonly id: string;
  readonly isDeleted: boolean;
}

export interface DiscussionView {
  /** The id the inline `comment` mark carries; null when the discussion is about the whole block. */
  readonly anchorMarkId: string | null;
  readonly blockId: string;
  /** Whether the reader may reply to it, resolve it and reopen it. */
  readonly canComment: boolean;
  readonly comments: readonly CommentView[];
  readonly createdAt: string;
  readonly createdById: string;
  readonly id: string;
  /** The page the block lives in, for jumping to it. */
  readonly pageId: string;
  readonly quote: string | null;
  readonly resolvedAt: string | null;
  readonly resolvedById: string | null;
}

export interface DiscussionPageView {
  readonly discussions: readonly DiscussionView[];
  readonly nextCursor: string | null;
}

export interface NotificationView {
  readonly actorId: string;
  readonly actorName: string;
  readonly blockId: string;
  readonly commentId: string | null;
  readonly createdAt: string;
  readonly discussionId: string | null;
  readonly excerpt: string;
  readonly id: string;
  readonly kind: NotificationKind;
  readonly pageId: string;
  readonly pageTitle: string;
  readonly readAt: string | null;
  /** The space of the page, which the address of the page needs. */
  readonly spaceId: string;
}

export interface NotificationPageView {
  readonly nextCursor: string | null;
  readonly notifications: readonly NotificationView[];
  readonly unreadCount: number;
}
