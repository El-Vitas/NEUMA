import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CollectionSubscription, LiveSubscription, TreeSubscription } from '../../domain/block.live.domain.types';
import { createMessageWindow } from '../../domain/block.live.rate.domain';
import type { BlockLiveConnection, BlockLiveSocket } from '../../types/block.live.types';

const toSubscriptions = (connection: BlockLiveConnection): LiveSubscription[] => {
  const userId = connection.reader?.userId;
  if (userId === undefined) return [];
  return [...connection.subscriptions].map(([pageId, spaceId]) => ({
    connectionId: connection.id,
    pageId,
    spaceId,
    userId,
  }));
};

const toCollectionSubscriptions = (connection: BlockLiveConnection): CollectionSubscription[] => {
  const userId = connection.reader?.userId;
  if (userId === undefined) return [];
  return [...connection.collectionSubscriptions].map(([collectionId, spaceId]) => ({
    collectionId,
    connectionId: connection.id,
    spaceId,
    userId,
  }));
};

const toTreeSubscriptions = (connection: BlockLiveConnection): TreeSubscription[] => {
  const userId = connection.reader?.userId;
  if (userId === undefined) return [];
  return [...connection.treeSubscriptions].map((spaceId) => ({ connectionId: connection.id, spaceId, userId }));
};

/** The sockets open in this process and what each is subscribed to. Scans are fine at the scale of one node. */
@Injectable()
export class BlockLiveRegistry {
  private readonly connections = new Map<string, BlockLiveConnection>();

  open(socket: BlockLiveSocket, now: number): BlockLiveConnection {
    const connection: BlockLiveConnection = {
      ageTimer: null,
      collectionSubscriptions: new Map(),
      deadlineTimer: null,
      id: randomUUID(),
      isClosed: false,
      messageWindow: createMessageWindow(now),
      pendingMessages: 0,
      queue: Promise.resolve(),
      reader: null,
      socket,
      subscriptions: new Map(),
      treeSubscriptions: new Set(),
    };
    this.connections.set(connection.id, connection);
    return connection;
  }

  remove(connection: BlockLiveConnection): void {
    this.connections.delete(connection.id);
  }

  find(connectionId: string): BlockLiveConnection | undefined {
    return this.connections.get(connectionId);
  }

  listConnections(): readonly BlockLiveConnection[] {
    return [...this.connections.values()];
  }

  countUnauthenticated(): number {
    return this.listConnections().filter((connection) => connection.reader === null).length;
  }

  countAuthenticatedFor(userId: string): number {
    return this.listConnections().filter((connection) => connection.reader?.userId === userId).length;
  }

  listSubscriptions(): readonly LiveSubscription[] {
    return this.listConnections().flatMap(toSubscriptions);
  }

  listSubscriptionsOfPage(pageId: string): readonly LiveSubscription[] {
    return this.listSubscriptions().filter((subscription) => subscription.pageId === pageId);
  }

  listSubscriptionsInSpace(spaceId: string): readonly LiveSubscription[] {
    return this.listSubscriptions().filter((subscription) => subscription.spaceId === spaceId);
  }

  listCollectionSubscriptions(): readonly CollectionSubscription[] {
    return this.listConnections().flatMap(toCollectionSubscriptions);
  }

  listCollectionSubscriptionsInSpace(spaceId: string): readonly CollectionSubscription[] {
    return this.listCollectionSubscriptions().filter((subscription) => subscription.spaceId === spaceId);
  }

  listTreeSubscriptions(): readonly TreeSubscription[] {
    return this.listConnections().flatMap(toTreeSubscriptions);
  }

  listTreeSubscriptionsInSpace(spaceId: string): readonly TreeSubscription[] {
    return this.listTreeSubscriptions().filter((subscription) => subscription.spaceId === spaceId);
  }
}
