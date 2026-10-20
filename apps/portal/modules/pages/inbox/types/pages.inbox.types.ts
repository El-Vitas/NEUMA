import type { NotificationView } from '@neuma/shared';
import type { BlockLiveSocket } from '../../block-sync/types/block-sync.types';

export interface PagesInboxFeedOptions {
  /** The channel is ready, for the first time and after each reconnection, when something may have been missed. */
  readonly onConnected: () => void;
  readonly onNotification: () => void;
  readonly openSocket: (url: string) => BlockLiveSocket;
  readonly requestToken: () => Promise<string | null>;
  readonly url: string;
}

export interface PagesInboxFeed {
  readonly destroy: () => void;
}

export type PagesInboxStatus = 'failed' | 'loading' | 'ready';

export interface PagesInbox {
  readonly hasMore: boolean;
  readonly isBusy: boolean;
  readonly loadMore: () => Promise<void>;
  readonly markAllRead: () => Promise<void>;
  readonly markRead: (notificationId: string) => Promise<void>;
  readonly notifications: readonly NotificationView[];
  readonly refresh: () => Promise<void>;
  readonly status: PagesInboxStatus;
  readonly unreadCount: number;
}
