import { Inject, Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { PinoLogger } from 'nestjs-pino';
import type { CommentEvent } from '../../common/types/comment-events.types';
import { BlockLiveAccessService } from './block.live.access.service';
import {
  BLOCK_LIVE_CLOSE_CODE,
  BLOCK_LIVE_EMPTY_ACCESS_CONTEXT,
  BLOCK_LIVE_SETTINGS,
  BLOCK_PRESENCE_STORE,
} from './constants/block.live.constants';
import { planCollectionDeliveries, planCollectionResync } from './domain/block.live.collection.domain';
import { planCommentNotificationDeliveries, planDiscussionDeliveries } from './domain/block.live.discussion.domain';
import type {
  CollectionSubscription,
  LiveAccessContext,
  LiveDelivery,
  LiveSubscription,
  NotificationConnection,
  PresenceEntry,
  ReaderSubscription,
  VersionNotification,
} from './domain/block.live.domain.types';
import { planPresenceDeliveries, planResync, planVersionDeliveries } from './domain/block.live.routing.domain';
import { BlockLiveRegistry } from './infrastructure/registry/block.live.registry';
import type {
  BlockLiveBroadcaster,
  BlockLiveConnection,
  BlockLiveLogger,
  BlockLiveSettings,
  BlockPresenceStore,
} from './types/block.live.types';
import type { BlockReader } from './types/blocks.types';
import { runWithDeadline } from './utils/block.live.deadline.utils';
import { parseCommentEvent, parseVersionNotification, serializeServerMessage } from './utils/block.live.message.utils';

const toPageId = (subscription: LiveSubscription): string => subscription.pageId;

/** Turns a committed transaction or a presence change into the messages each subscribed socket may receive. */
@Injectable()
export class BlockLiveFanoutService implements BlockLiveBroadcaster {
  private pending: Promise<void> = Promise.resolve();

  constructor(
    @Inject(BlockLiveRegistry) private readonly registry: BlockLiveRegistry,
    @Inject(BlockLiveAccessService) private readonly accessService: BlockLiveAccessService,
    @Inject(BLOCK_PRESENCE_STORE) private readonly presenceStore: BlockPresenceStore,
    @Inject(PinoLogger) private readonly logger: BlockLiveLogger,
    @Inject(BLOCK_LIVE_SETTINGS) private readonly settings: BlockLiveSettings,
  ) {}

  /** Notifications are handled one after the other, so the versions of a page reach a socket in commit order. */
  enqueueNotification(payload: string): void {
    this.pending = this.handleAfter(this.pending, payload);
  }

  /** Comment events share the queue, so they reach a socket in the order the transactions committed. */
  enqueueCommentEvent(payload: string): void {
    this.pending = this.handleCommentEventAfter(this.pending, payload);
  }

  drain(): Promise<void> {
    return this.pending;
  }

  /** After the listen connection was lost, notifications may be missing: every subscriber reads again. */
  resyncEverySubscription(): void {
    this.pending = this.resyncAfter(this.pending);
  }

  async broadcastPresence(pageId: string): Promise<void> {
    await this.sendPresence(pageId, this.registry.listSubscriptionsOfPage(pageId), true);
  }

  async sendPresenceTo(connectionId: string, pageId: string): Promise<void> {
    const subscriptions = this.registry
      .listSubscriptionsOfPage(pageId)
      .filter((subscription) => subscription.connectionId === connectionId);
    await this.sendPresence(pageId, subscriptions, false);
  }

  async expirePresence(): Promise<void> {
    try {
      const pageIds = this.presenceStore.expire(Date.now());
      await Promise.all(pageIds.map((pageId) => this.broadcastPresence(pageId)));
    } catch (error) {
      this.logFailure(error);
    }
  }

  private async handleAfter(previous: Promise<void>, payload: string): Promise<void> {
    await previous;
    await this.runStep(() => this.handleNotification(payload));
  }

  private async handleCommentEventAfter(previous: Promise<void>, payload: string): Promise<void> {
    await previous;
    await this.runStep(() => this.handleCommentEvent(payload));
  }

  /**
   * One step of the queue. A step that fails, or that has not finished at its deadline, is logged with its stack and
   * every subscriber reads again, because what that step had to tell them is lost. The queue itself always moves on.
   */
  private async runStep(step: () => Promise<void>): Promise<void> {
    try {
      await runWithDeadline(step, this.settings.deliveryTimeoutMs);
    } catch (error) {
      this.logFailure(error);
      this.resyncEverySubscription();
    }
  }

  /** An event that cannot be read is dropped and logged: the next read over HTTP is always right. */
  private async handleCommentEvent(payload: string): Promise<void> {
    const parsed = parseCommentEvent(payload);
    if (parsed.isFail()) {
      this.logger.error({ err: parsed.getError() }, 'live channel received a comment event it could not read');
      return;
    }
    const event = parsed.getValue();
    if (event.kind === 'notification') {
      await this.deliver(
        planCommentNotificationDeliveries({
          connections: this.listAuthenticatedConnections(),
          notificationId: event.notificationId,
          recipientId: event.recipientId,
        }),
      );
      return;
    }
    await this.deliver(await this.planDiscussion(event));
  }

  private async planDiscussion(event: Extract<CommentEvent, { kind: 'discussion' }>): Promise<LiveDelivery[]> {
    const subscriptions = this.registry.listSubscriptionsInSpace(event.spaceId);
    if (subscriptions.length === 0) return [];
    const current = await this.applyCurrentAccounts(subscriptions);
    const seedIds = [...new Set([event.blockId, ...current.map(toPageId)])];
    const context = await this.accessService.loadContext(seedIds, this.listReaders(current));
    return planDiscussionDeliveries({
      blockId: event.blockId,
      context,
      discussionId: event.discussionId,
      subscriptions: current,
    });
  }

  private listAuthenticatedConnections(): NotificationConnection[] {
    return this.registry
      .listConnections()
      .flatMap((connection) =>
        connection.reader === null || connection.isClosed
          ? []
          : [{ connectionId: connection.id, userId: connection.reader.userId }],
      );
  }

  /** Queued behind the notifications already waiting, so a resync is never overtaken by an older version. */
  private async resyncAfter(previous: Promise<void>): Promise<void> {
    await previous;
    try {
      await this.deliver([
        ...planResync(this.registry.listSubscriptions()),
        ...planCollectionResync(this.registry.listCollectionSubscriptions()),
      ]);
    } catch (error) {
      this.logFailure(error);
    }
  }

  private async handleNotification(payload: string): Promise<void> {
    const parsed = parseVersionNotification(payload);
    if (parsed.isFail()) {
      this.logger.error({ err: parsed.getError() }, 'live channel received a notification it could not read');
      this.resyncEverySubscription();
      return;
    }
    const notification = parsed.getValue();
    const subscriptions = this.registry.listSubscriptionsInSpace(notification.spaceId);
    const collectionSubscriptions = this.registry.listCollectionSubscriptionsInSpace(notification.spaceId);
    if (subscriptions.length === 0 && collectionSubscriptions.length === 0) return;
    if (notification.kind === 'truncated') {
      await this.deliver([...planResync(subscriptions), ...planCollectionResync(collectionSubscriptions)]);
      return;
    }
    await this.deliver(await this.planVersions(notification, subscriptions, collectionSubscriptions));
  }

  /** One refresh of the accounts, one read of the chains and one role lookup serve pages and collections alike. */
  private async planVersions(
    notification: Extract<VersionNotification, { kind: 'versions' }>,
    subscriptions: readonly LiveSubscription[],
    collectionSubscriptions: readonly CollectionSubscription[],
  ): Promise<LiveDelivery[]> {
    try {
      const available = await this.applyCurrentAccounts([...subscriptions, ...collectionSubscriptions]);
      const availableUserIds = new Set(available.map((subscription) => subscription.userId));
      const current = subscriptions.filter((subscription) => availableUserIds.has(subscription.userId));
      const currentCollections = collectionSubscriptions.filter((subscription) =>
        availableUserIds.has(subscription.userId),
      );
      const seedIds = [
        ...new Set([
          ...notification.blocks.map((block) => block.id),
          ...current.map(toPageId),
          ...currentCollections.map((subscription) => subscription.collectionId),
        ]),
      ];
      const context = await this.accessService.loadContext(
        seedIds,
        this.listReaders([...current, ...currentCollections]),
      );
      return [
        ...planVersionDeliveries({ blocks: notification.blocks, context, subscriptions: current }),
        ...planCollectionDeliveries({
          blocks: notification.blocks,
          context,
          subscriptions: currentCollections,
          views: notification.views,
        }),
      ];
    } catch (error) {
      this.logger.error({ err: error }, 'live channel could not resolve who may read a notification');
      return [...planResync(subscriptions), ...planCollectionResync(collectionSubscriptions)];
    }
  }

  /**
   * The role in a token is the one the user had when the socket opened. Before routing, the sockets take the role
   * the account has now, and those of a user who is gone or inactive are closed and left out.
   */
  private async applyCurrentAccounts<Subscription extends ReaderSubscription>(
    subscriptions: readonly Subscription[],
  ): Promise<Subscription[]> {
    const refreshed = await this.accessService.refreshReaders(this.listReaders(subscriptions));
    const rolesByUserId = new Map(refreshed.readers.map((reader) => [reader.userId, reader.role]));
    for (const connectionId of new Set(subscriptions.map((subscription) => subscription.connectionId))) {
      this.applyAccountToConnection(connectionId, rolesByUserId, refreshed.unavailableUserIds);
    }
    return subscriptions.filter((subscription) => !refreshed.unavailableUserIds.has(subscription.userId));
  }

  private applyAccountToConnection(
    connectionId: string,
    rolesByUserId: ReadonlyMap<string, UserRole>,
    unavailableUserIds: ReadonlySet<string>,
  ): void {
    const connection = this.registry.find(connectionId);
    const reader = connection?.reader;
    if (connection === undefined || reader === null || reader === undefined) return;
    const role = rolesByUserId.get(reader.userId);
    if (unavailableUserIds.has(reader.userId)) {
      connection.socket.close(BLOCK_LIVE_CLOSE_CODE.unauthorized, 'account-unavailable');
      return;
    }
    if (role !== undefined) connection.reader = { ...reader, role };
  }

  private async sendPresence(
    pageId: string,
    subscriptions: readonly LiveSubscription[],
    isSentWhenEmpty: boolean,
  ): Promise<void> {
    const entries = this.presenceStore.list(pageId, Date.now());
    if (subscriptions.length === 0 || (entries.length === 0 && !isSentWhenEmpty)) return;
    const context = await this.loadPresenceContext(pageId, entries, subscriptions);
    await this.deliver(planPresenceDeliveries({ context, entries, pageId, subscriptions }));
  }

  private logFailure(error: unknown): void {
    this.logger.error({ err: error }, 'live channel could not deliver');
  }

  private async loadPresenceContext(
    pageId: string,
    entries: readonly PresenceEntry[],
    subscriptions: readonly LiveSubscription[],
  ): Promise<LiveAccessContext> {
    const blockIds = entries.flatMap((entry) => (entry.blockId === null ? [] : [entry.blockId]));
    if (blockIds.length === 0) return BLOCK_LIVE_EMPTY_ACCESS_CONTEXT;
    try {
      return await this.accessService.loadContext([pageId, ...new Set(blockIds)], this.listReaders(subscriptions));
    } catch (error) {
      this.logger.error({ err: error }, 'live channel could not resolve who may see a presence block');
      return BLOCK_LIVE_EMPTY_ACCESS_CONTEXT;
    }
  }

  private listReaders(subscriptions: readonly ReaderSubscription[]): BlockReader[] {
    return subscriptions.flatMap((subscription) => {
      const reader = this.registry.find(subscription.connectionId)?.reader;
      return reader === null || reader === undefined ? [] : [reader];
    });
  }

  private async deliver(deliveries: readonly LiveDelivery[]): Promise<void> {
    const releasedPageIds = new Set(deliveries.flatMap((delivery) => this.applyDelivery(delivery)));
    await Promise.all([...releasedPageIds].map((pageId) => this.broadcastPresence(pageId)));
  }

  /** Returns the pages whose presence changed because a revoked subscriber left them. */
  private applyDelivery(delivery: LiveDelivery): string[] {
    const connection = this.registry.find(delivery.connectionId);
    if (connection === undefined || connection.isClosed) return [];
    connection.socket.send(serializeServerMessage(delivery.message));
    if (delivery.message.type === 'collection-revoked') {
      connection.collectionSubscriptions.delete(delivery.message.collectionId);
      return [];
    }
    return delivery.message.type === 'revoked' ? this.dropSubscription(connection, delivery.message.pageId) : [];
  }

  private dropSubscription(connection: BlockLiveConnection, pageId: string): string[] {
    connection.subscriptions.delete(pageId);
    return this.presenceStore.remove(pageId, connection.id) ? [pageId] : [];
  }
}
