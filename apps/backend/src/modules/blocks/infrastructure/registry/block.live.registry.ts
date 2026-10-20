import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { LiveSubscription } from '../../domain/block.live.domain.types';
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

/** The sockets open in this process and what each is subscribed to. Scans are fine at the scale of one node. */
@Injectable()
export class BlockLiveRegistry {
  private readonly connections = new Map<string, BlockLiveConnection>();

  open(socket: BlockLiveSocket, now: number): BlockLiveConnection {
    const connection: BlockLiveConnection = {
      ageTimer: null,
      deadlineTimer: null,
      id: randomUUID(),
      isClosed: false,
      messageWindow: createMessageWindow(now),
      queue: Promise.resolve(),
      reader: null,
      socket,
      subscriptions: new Map(),
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
}
