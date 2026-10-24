import type { BlockRichText, NotificationKind } from '@neuma/shared';
import type { KeysetPosition } from '../../../common/types/keyset-cursor.types';

/** A notification row as the database returns it, with its kind still a plain string. */
export interface NotificationRow {
  readonly actorId: string;
  readonly blockId: string;
  readonly commentId: string | null;
  readonly createdAt: Date;
  readonly discussionId: string | null;
  readonly id: string;
  readonly kind: string;
  readonly readAt: Date | null;
  readonly recipientId: string;
}

export interface NotificationListRequest {
  readonly cursor?: string | undefined;
  readonly limit?: number | undefined;
  readonly unreadOnly: boolean;
}

export interface NotificationRecord {
  readonly actorId: string;
  readonly blockId: string;
  readonly commentId: string | null;
  readonly createdAt: Date;
  readonly discussionId: string | null;
  readonly id: string;
  readonly kind: NotificationKind;
  readonly readAt: Date | null;
  readonly recipientId: string;
}

export interface NotificationListQuery {
  readonly after: KeysetPosition | null;
  readonly recipientId: string;
  readonly size: number;
  readonly unreadOnly: boolean;
}

/** What a notification shows besides its own columns: the words of the comment, or of the block for a text mention. */
export interface NotificationSources {
  readonly actorNames: ReadonlyMap<string, string>;
  readonly commentBodies: ReadonlyMap<string, BlockRichText>;
  readonly blockTexts: ReadonlyMap<string, string>;
}

export interface TextMentionBlock {
  readonly id: string;
  readonly properties: unknown;
  readonly spaceId: string;
}

export interface NotificationRepositoryContract {
  readonly deleteReadBefore: (cutoff: Date) => Promise<number>;
  readonly findOwned: (notificationId: string, recipientId: string) => Promise<NotificationRecord | null>;
  readonly list: (query: NotificationListQuery) => Promise<readonly NotificationRecord[]>;
  readonly listUnread: (recipientId: string, max: number) => Promise<readonly NotificationRecord[]>;
  readonly markAllRead: (recipientId: string, readAt: Date) => Promise<number>;
  readonly markRead: (notificationId: string, readAt: Date) => Promise<void>;
  readonly readSources: (records: readonly NotificationRecord[]) => Promise<NotificationSources>;
}

export interface TextMentionRepositoryContract {
  readonly createTextMentions: (
    drafts: readonly { actorId: string; blockId: string; recipientId: string }[],
  ) => Promise<void>;
  readonly findBlocks: (blockIds: readonly string[]) => Promise<readonly TextMentionBlock[]>;
  readonly findNotifiedUserIds: (blockId: string, userIds: readonly string[]) => Promise<ReadonlySet<string>>;
  readonly findWorkspaceIdOfSpace: (spaceId: string) => Promise<string | null>;
}
