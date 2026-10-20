import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_EXCERPT_MAX_LENGTH,
  NOTIFICATIONS_PAGE_SIZE_DEFAULT,
  NOTIFICATIONS_PAGE_SIZE_MAX,
  type NotificationPageView,
  type NotificationView,
  Result,
  readCommentExcerpt,
} from '@neuma/shared';
import { BlockAccessRepository } from '../../common/infrastructure/persistence/block-access.repository';
import { BlockPageLocator } from '../../common/infrastructure/persistence/block-page.locator';
import type { BlockAccessViewer } from '../../common/types/block-access.types';
import type { BlockPageLocation } from '../../common/types/block-page.types';
import { decodeKeysetCursor, encodeKeysetCursor } from '../../common/utils/keyset-cursor.utils';
import {
  NOTIFICATION_BATCH_ROUNDS_MAX,
  NOTIFICATION_REPOSITORY,
  NOTIFICATION_SCAN_FACTOR,
  NOTIFICATION_UNREAD_SCAN_MAX,
} from './constants/notifications.constants';
import { computeReadRetentionCutoff } from './domain/notification.domain';
import { NotificationNotFoundError } from './domain/notification.error';
import type {
  NotificationListRequest,
  NotificationRecord,
  NotificationRepositoryContract,
  NotificationSources,
} from './types/notification.types';

const readExcerpt = (record: NotificationRecord, sources: NotificationSources): string => {
  const body = record.commentId === null ? undefined : sources.commentBodies.get(record.commentId);
  if (body !== undefined) return readCommentExcerpt(body, NOTIFICATION_EXCERPT_MAX_LENGTH);
  const text = sources.blockTexts.get(record.blockId)?.trim() ?? '';
  return text.length <= NOTIFICATION_EXCERPT_MAX_LENGTH ? text : `${text.slice(0, NOTIFICATION_EXCERPT_MAX_LENGTH)}…`;
};

const toView = (
  record: NotificationRecord,
  sources: NotificationSources,
  locations: ReadonlyMap<string, BlockPageLocation>,
): NotificationView => ({
  actorId: record.actorId,
  actorName: sources.actorNames.get(record.actorId) ?? '',
  blockId: record.blockId,
  commentId: record.commentId,
  createdAt: record.createdAt.toISOString(),
  discussionId: record.discussionId,
  excerpt: readExcerpt(record, sources),
  id: record.id,
  kind: record.kind,
  pageId: locations.get(record.blockId)?.pageId ?? record.blockId,
  pageTitle: locations.get(record.blockId)?.pageTitle ?? '',
  spaceId: locations.get(record.blockId)?.spaceId ?? '',
  readAt: record.readAt?.toISOString() ?? null,
});

/** A person's inbox. What they may read is judged when they ask, so a revoked block disappears from it at once. */
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepositoryContract,
    private readonly blockAccess: BlockAccessRepository,
    private readonly pageLocator: BlockPageLocator,
  ) {}

  async list(viewer: BlockAccessViewer, request: NotificationListRequest): Promise<NotificationPageView> {
    const limit = Math.min(request.limit ?? NOTIFICATIONS_PAGE_SIZE_DEFAULT, NOTIFICATIONS_PAGE_SIZE_MAX);
    const [readable, unreadCount] = await Promise.all([
      this.collectReadable(viewer, request, limit),
      this.countUnread(viewer),
    ]);
    const shown = readable.slice(0, limit);
    const last = shown.at(-1);
    return {
      nextCursor:
        readable.length > limit && last !== undefined ? encodeKeysetCursor({ at: last.createdAt, id: last.id }) : null,
      notifications: await this.toViews(shown),
      unreadCount,
    };
  }

  async countUnread(viewer: BlockAccessViewer): Promise<number> {
    const unread = await this.notifications.listUnread(viewer.userId, NOTIFICATION_UNREAD_SCAN_MAX);
    const readable = await this.blockAccess.findReadableBlockIds(
      unread.map((record) => record.blockId),
      viewer,
    );
    return unread.filter((record) => readable.has(record.blockId)).length;
  }

  async markRead(viewer: BlockAccessViewer, notificationId: string): Promise<Result<void, NotificationNotFoundError>> {
    const owned = await this.notifications.findOwned(notificationId, viewer.userId);
    if (owned === null) return Result.fail(new NotificationNotFoundError());
    await this.notifications.markRead(owned.id, new Date());
    return Result.ok(undefined);
  }

  async markAllRead(viewer: BlockAccessViewer): Promise<number> {
    return this.notifications.markAllRead(viewer.userId, new Date());
  }

  async purgeReadPastRetention(now: Date): Promise<number> {
    return this.notifications.deleteReadBefore(computeReadRetentionCutoff(now));
  }

  private async collectReadable(
    viewer: BlockAccessViewer,
    request: NotificationListRequest,
    limit: number,
  ): Promise<NotificationRecord[]> {
    const size = limit * NOTIFICATION_SCAN_FACTOR;
    const kept: NotificationRecord[] = [];
    let after = decodeKeysetCursor(request.cursor);
    for (let round = 0; round < NOTIFICATION_BATCH_ROUNDS_MAX && kept.length <= limit; round += 1) {
      const candidates = await this.notifications.list({
        after,
        recipientId: viewer.userId,
        size,
        unreadOnly: request.unreadOnly,
      });
      if (candidates.length === 0) break;
      const readable = await this.blockAccess.findReadableBlockIds(
        candidates.map((candidate) => candidate.blockId),
        viewer,
      );
      kept.push(...candidates.filter((candidate) => readable.has(candidate.blockId)));
      const last = candidates.at(-1);
      if (candidates.length < size || last === undefined) break;
      after = { at: last.createdAt, id: last.id };
    }
    return kept.slice(0, limit + 1);
  }

  private async toViews(records: readonly NotificationRecord[]): Promise<NotificationView[]> {
    if (records.length === 0) return [];
    const [sources, locations] = await Promise.all([
      this.notifications.readSources(records),
      this.pageLocator.locate(records.map((record) => record.blockId)),
    ]);
    return records.map((record) => toView(record, sources, locations));
  }
}
