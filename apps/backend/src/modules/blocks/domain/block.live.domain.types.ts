import type { BlockPermissions } from '@neuma/shared';
import type { RolesById } from '../../../common/domain/block-access.domain.types';
import type { BLOCK_LIVE_ERROR_CODE } from './block.live.constants';
import type { BlockVersion } from './block.transaction.domain.types';

/** What the roles of a block need: itself and every ancestor, without content. */
export interface BlockChainRow {
  readonly alive: boolean;
  readonly id: string;
  readonly parentId: string | null;
  readonly permissions: BlockPermissions;
  readonly spaceId: string;
  readonly type: string;
}

export type ChainRowsById = ReadonlyMap<string, BlockChainRow>;

/** What one viewer may read among the rows loaded for a notification. */
export interface ViewerAccess {
  readonly maxDepth: number;
  readonly rolesById: RolesById;
  readonly rowsById: ChainRowsById;
}

/** The rows loaded once for a notification, and the roles of each user subscribed over them. */
export interface LiveAccessContext {
  readonly maxDepth: number;
  readonly rolesByUserId: ReadonlyMap<string, RolesById>;
  readonly rowsById: ChainRowsById;
}

export interface LiveSubscription {
  readonly connectionId: string;
  readonly pageId: string;
  readonly spaceId: string;
  readonly userId: string;
}

/** A committed transaction as the listener understands it: the touched blocks, or only that they were too many. */
export type VersionNotification =
  | { readonly blocks: readonly BlockVersion[]; readonly kind: 'versions'; readonly spaceId: string }
  | { readonly kind: 'truncated'; readonly spaceId: string };

export interface PresenceEntry {
  readonly blockId: string | null;
  readonly connectionId: string;
  readonly expiresAt: number;
  readonly userId: string;
}

export interface PresenceUser {
  readonly blockId: string | null;
  readonly expiresAt: number;
  readonly userId: string;
}

export type LiveErrorCode = (typeof BLOCK_LIVE_ERROR_CODE)[keyof typeof BLOCK_LIVE_ERROR_CODE];

export type LiveServerMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'pong' }
  | { readonly pageId: string; readonly type: 'subscribed' }
  | { readonly code: LiveErrorCode; readonly pageId?: string; readonly type: 'error' }
  | { readonly blocks: readonly BlockVersion[]; readonly pageId: string; readonly type: 'versions' }
  | { readonly pageId: string; readonly type: 'resync' }
  | { readonly pageId: string; readonly type: 'revoked' }
  | { readonly pageId: string; readonly type: 'presence'; readonly users: readonly PresenceUser[] }
  | { readonly blockId: string; readonly discussionId: string; readonly pageId: string; readonly type: 'discussion' }
  | { readonly notificationId: string; readonly type: 'notification' };

/** An open socket whose user is known, which is all that a notification needs to find its recipient. */
export interface NotificationConnection {
  readonly connectionId: string;
  readonly userId: string;
}

export interface DiscussionDeliveryInput {
  readonly blockId: string;
  readonly context: LiveAccessContext;
  readonly discussionId: string;
  readonly subscriptions: readonly LiveSubscription[];
}

export interface CommentNotificationDeliveryInput {
  readonly connections: readonly NotificationConnection[];
  readonly notificationId: string;
  readonly recipientId: string;
}

export interface LiveDelivery {
  readonly connectionId: string;
  readonly message: LiveServerMessage;
}

export interface VersionDeliveryInput {
  readonly blocks: readonly BlockVersion[];
  readonly context: LiveAccessContext;
  readonly subscriptions: readonly LiveSubscription[];
}

export interface PresenceDeliveryInput {
  readonly context: LiveAccessContext;
  readonly entries: readonly PresenceEntry[];
  readonly pageId: string;
  readonly subscriptions: readonly LiveSubscription[];
}

export interface PresenceReport {
  readonly blockId: string | null;
  readonly connectionId: string;
  readonly userId: string;
}

export interface RegisteredMessage {
  readonly isAllowed: boolean;
  readonly window: MessageWindow;
}

export interface MessageWindow {
  readonly count: number;
  readonly startedAt: number;
}

export interface MessageRateLimit {
  readonly maxMessages: number;
  readonly windowMs: number;
}
