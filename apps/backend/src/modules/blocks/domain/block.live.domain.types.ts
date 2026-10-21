import type { BlockPermissions } from '@neuma/shared';
import type { RolesById } from '../../../common/domain/block-access.domain.types';
import type { BLOCK_LIVE_ERROR_CODE } from './block.live.constants';
import type { BlockVersion, NotifiedBlock, NotifiedView } from './block.transaction.domain.types';

/** What the roles of a block need: itself and every ancestor, without content. */
export interface BlockChainRow {
  readonly alive: boolean;
  readonly id: string;
  /** A template page is not a row of its collection (ADR 027). */
  readonly isTemplate?: boolean;
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
  | {
      readonly blocks: readonly NotifiedBlock[];
      readonly kind: 'versions';
      readonly spaceId: string;
      readonly views: readonly NotifiedView[];
    }
  | { readonly kind: 'truncated'; readonly spaceId: string };

/** A socket that follows the rows, views and schema of one collection. */
export interface CollectionSubscription {
  readonly collectionId: string;
  readonly connectionId: string;
  readonly spaceId: string;
  readonly userId: string;
}

/** What the channel needs to find the person behind a subscription. */
export type ReaderSubscription = Pick<LiveSubscription, 'connectionId' | 'userId'>;

/** The rows of a collection that one subscriber may read among the ones a transaction touched. */
export interface CollectionRowSlice {
  readonly isResyncNeeded: boolean;
  readonly rows: readonly NotifiedBlock[];
}

export interface CollectionDeliveryInput {
  readonly blocks: readonly NotifiedBlock[];
  readonly context: LiveAccessContext;
  readonly subscriptions: readonly CollectionSubscription[];
  readonly views: readonly NotifiedView[];
}

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
  | { readonly collectionId: string; readonly type: 'subscribed-collection' }
  | {
      readonly collectionId: string;
      readonly rows: readonly BlockVersion[];
      readonly schemaVersion?: number;
      readonly type: 'collection-changes';
      readonly views: readonly BlockVersion[];
    }
  | { readonly collectionId: string; readonly type: 'collection-resync' }
  | { readonly collectionId: string; readonly type: 'collection-revoked' }
  | {
      readonly code: LiveErrorCode;
      readonly collectionId?: string;
      readonly pageId?: string;
      readonly type: 'error';
    }
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
