import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import {
  BLOCK_SYNC_CLOSE_CODE,
  BLOCK_SYNC_PING_INTERVAL_MS,
  BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS,
  BLOCK_SYNC_REQUEST_TIMEOUT_MS,
} from '@/modules/pages/block-sync/constants/block-sync.constants';
import { BlockLiveRequestError } from '@/modules/pages/block-sync/lib/block-sync.errors.lib';
import { createBlockLiveSession } from '@/modules/pages/block-sync/lib/block-sync.session.lib';
import type {
  BlockLiveSocket,
  BlockLiveSocketHandlers,
  BlockPresenceUser,
  BlockVersion,
} from '@/modules/pages/block-sync/types/block-sync.types';
import { computeCollaborationReconnectDelayMs } from '@/modules/pages/lib/pages.collaboration.lib';
import type { CollaborationStatus } from '@/modules/pages/types/pages.collaboration.types';

class FakeSocket implements BlockLiveSocket {
  readonly sent: Record<string, unknown>[] = [];
  isClosed = false;
  private handlers: BlockLiveSocketHandlers | null = null;

  close = (): void => {
    this.isClosed = true;
  };

  listen = (handlers: BlockLiveSocketHandlers): void => {
    this.handlers = handlers;
  };

  send = (text: string): void => {
    this.sent.push(JSON.parse(text));
  };

  open(): void {
    this.handlers?.onOpen();
  }

  receive(message: Record<string, unknown>): void {
    this.handlers?.onMessage(JSON.stringify(message));
  }

  closeWith(code: number): void {
    this.handlers?.onClose(code);
  }

  sentOfType(type: string): Record<string, unknown>[] {
    return this.sent.filter((message) => message.type === type);
  }
}

const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
};

const createHarness = (tokens: readonly (string | null)[] = ['token-1', 'token-2', 'token-3', 'token-4']) => {
  const sockets: FakeSocket[] = [];
  const statuses: CollaborationStatus[] = [];
  const versions: (readonly BlockVersion[])[] = [];
  const presences: (readonly BlockPresenceUser[])[] = [];
  const events: string[] = [];
  let tokenCalls = 0;
  const session = createBlockLiveSession({
    handlers: {
      onConnected: () => events.push('connected'),
      onDisconnected: () => events.push('disconnected'),
      onPresence: (users) => presences.push(users),
      onResync: () => events.push('resync'),
      onRevoked: () => events.push('revoked'),
      onStatusChange: (status) => statuses.push(status),
      onVersions: (blocks) => versions.push(blocks),
    },
    openSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    pageId: 'page-1',
    requestToken: () => {
      const token = tokens[tokenCalls] ?? null;
      tokenCalls += 1;
      return Promise.resolve(token);
    },
    url: 'ws://localhost/api/v1/blocks/live',
  });
  return { events, presences, session, sockets, statuses, tokenCalls: () => tokenCalls, versions };
};

const connectFirstSocket = async (harness: ReturnType<typeof createHarness>): Promise<FakeSocket> => {
  await flush();
  const socket = harness.sockets.at(-1);
  if (socket === undefined) throw new Error('No socket was opened');
  socket.open();
  socket.receive({ type: 'ready' });
  socket.receive({ pageId: 'page-1', type: 'subscribed' });
  await flush();
  return socket;
};

describe('createBlockLiveSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('authenticates with a fresh token, subscribes to the page and reports connected', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    expect(socket.sent[0]).toEqual({ token: 'token-1', type: 'auth' });
    expect(socket.sent[1]).toEqual({ pageId: 'page-1', type: 'subscribe' });
    expect(harness.statuses).toEqual(['connecting', 'connected']);
    expect(harness.events).toEqual(['connected']);
  });

  it('answers a request with the reply that carries its request id', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    const reply = harness.session.request({ pageId: 'page-1', type: 'sync' });
    const request = socket.sentOfType('sync')[0];
    socket.receive({ blocks: [], requestId: request?.requestId, type: 'syncResult' });

    expect(await reply).toEqual({ blocks: [], type: 'syncResult' });
  });

  it('keeps two requests apart', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    const first = harness.session.request({ pageId: 'page-1', type: 'sync' });
    const second = harness.session.request({ blocks: [{ id: 'b', version: 1 }], type: 'sync' });
    const [firstRequest, secondRequest] = socket.sentOfType('sync');
    socket.receive({ blocks: [], requestId: secondRequest?.requestId, revoked: ['gone'], type: 'syncResult' });
    socket.receive({ blocks: [], requestId: firstRequest?.requestId, type: 'syncResult' });

    expect(await second).toEqual({ blocks: [], revoked: ['gone'], type: 'syncResult' });
    expect(await first).toEqual({ blocks: [], type: 'syncResult' });
  });

  it('rejects a request the server answered with an error, carrying its code', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    const reply = harness.session.request({ pageId: 'page-1', type: 'sync' });
    socket.receive({ code: 'rate-limited', requestId: socket.sentOfType('sync')[0]?.requestId, type: 'error' });

    expect(reply).rejects.toMatchObject({ code: 'rate-limited' });
    await flush();
  });

  it('rejects a request that gets no answer in time', async () => {
    const harness = createHarness();
    await connectFirstSocket(harness);

    const reply = harness.session.request({ pageId: 'page-1', type: 'sync' });
    const outcome = reply.catch((error: unknown) => error);
    jest.advanceTimersByTime(BLOCK_SYNC_REQUEST_TIMEOUT_MS);

    expect(await outcome).toBeInstanceOf(BlockLiveRequestError);
    expect(await outcome).toMatchObject({ code: 'timeout' });
  });

  it('rejects a request made while there is no connection', async () => {
    const harness = createHarness();

    await expect(harness.session.request({ pageId: 'page-1', type: 'sync' })).rejects.toMatchObject({
      code: 'closed',
    });
  });

  it('rejects the requests in flight when the socket closes, and reconnects after a delay', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);
    const reply = harness.session.request({ pageId: 'page-1', type: 'sync' });
    const outcome = reply.catch((error: unknown) => error);

    socket.closeWith(1006);

    expect(await outcome).toMatchObject({ code: 'closed' });
    expect(harness.statuses.at(-1)).toBe('reconnecting');
    expect(harness.events).toEqual(['connected', 'disconnected']);
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();
    expect(harness.sockets).toHaveLength(2);
  });

  it('asks for a new token and reconnects at once when the server asks to reconnect', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    socket.closeWith(BLOCK_SYNC_CLOSE_CODE.reconnectRequired);
    await flush();

    expect(harness.sockets).toHaveLength(2);
    expect(harness.tokenCalls()).toBe(2);
    harness.sockets[1]?.open();
    expect(harness.sockets[1]?.sent[0]).toEqual({ token: 'token-2', type: 'auth' });
  });

  it('stops and reports an error when the token is refused', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    socket.closeWith(BLOCK_SYNC_CLOSE_CODE.unauthorized);
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(10) * 2);
    await flush();

    expect(harness.statuses.at(-1)).toBe('error');
    expect(harness.sockets).toHaveLength(1);
  });

  it.each([BLOCK_SYNC_CLOSE_CODE.tooManyConnections, BLOCK_SYNC_CLOSE_CODE.policyViolation])(
    'waits at least the rate limit delay to reconnect after close code %p',
    async (code) => {
      const harness = createHarness();
      const socket = await connectFirstSocket(harness);

      socket.closeWith(code);
      jest.advanceTimersByTime(BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS - 1);
      await flush();
      expect(harness.sockets).toHaveLength(1);

      jest.advanceTimersByTime(1);
      await flush();
      expect(harness.sockets).toHaveLength(2);
    },
  );

  it('retries later when no token can be had', async () => {
    const harness = createHarness([null, 'token-2']);
    await flush();
    expect(harness.sockets).toHaveLength(0);
    expect(harness.statuses.at(-1)).toBe('reconnecting');

    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();

    expect(harness.sockets).toHaveLength(1);
  });

  it('starts counting attempts again once connected', async () => {
    const harness = createHarness();
    const first = await connectFirstSocket(harness);
    first.closeWith(1006);
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();
    const second = await connectFirstSocket(harness);

    second.closeWith(1006);
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();

    expect(harness.sockets).toHaveLength(3);
  });

  it('passes on what the server pushes', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    socket.receive({ blocks: [{ id: 'b1', version: 4 }], pageId: 'page-1', type: 'versions' });
    socket.receive({ pageId: 'page-1', type: 'resync' });
    socket.receive({ pageId: 'page-1', type: 'revoked' });
    socket.receive({
      pageId: 'page-1',
      type: 'presence',
      users: [{ blockId: 'b1', expiresAt: 10, userId: 'user-2' }],
    });

    expect(harness.versions).toEqual([[{ id: 'b1', version: 4 }]]);
    expect(harness.events).toEqual(['connected', 'resync', 'revoked']);
    expect(harness.presences).toEqual([[{ blockId: 'b1', expiresAt: 10, userId: 'user-2' }]]);
  });

  it('ignores a message that does not follow the protocol', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    socket.receive({ type: 'surprise' });
    socket.receive({ pageId: 'page-1', type: 'versions' });

    expect(harness.versions).toEqual([]);
  });

  it('pings while connected so the server does not close an idle socket', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    jest.advanceTimersByTime(BLOCK_SYNC_PING_INTERVAL_MS * 2);

    expect(socket.sentOfType('ping')).toHaveLength(2);
  });

  it('sends where the cursor is', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    harness.session.sendPresence('b1');
    harness.session.sendPresence(null);

    expect(socket.sentOfType('presence')).toEqual([
      { blockId: 'b1', pageId: 'page-1', type: 'presence' },
      { blockId: null, pageId: 'page-1', type: 'presence' },
    ]);
  });

  it('reports a page it may no longer read as revoked', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    socket.receive({ code: 'access-denied', pageId: 'page-1', type: 'error' });

    expect(harness.events).toContain('revoked');
  });

  it('closes the socket and stops reconnecting once destroyed', async () => {
    const harness = createHarness();
    const socket = await connectFirstSocket(harness);

    harness.session.destroy();
    socket.closeWith(1006);
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(10));
    await flush();

    expect(socket.isClosed).toBe(true);
    expect(harness.sockets).toHaveLength(1);
  });
});

describe('createBlockLiveSession following a collection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const createCollectionHarness = () => {
    const sockets: FakeSocket[] = [];
    const events: Record<string, unknown>[] = [];
    const connections: string[] = [];
    createBlockLiveSession({
      collectionId: 'collection-1',
      handlers: {
        onConnected: () => connections.push('connected'),
        onDisconnected: () => connections.push('disconnected'),
        onPresence: () => undefined,
        onResync: () => undefined,
        onRevoked: () => undefined,
        onStatusChange: () => undefined,
        onVersions: () => undefined,
      },
      onCollectionMessage: (message) => events.push(message),
      openSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      pageId: 'collection-1',
      requestToken: () => Promise.resolve('token-1'),
      url: 'ws://localhost/api/v1/blocks/live',
    });
    return { connections, events, sockets };
  };

  const open = async (harness: ReturnType<typeof createCollectionHarness>): Promise<FakeSocket> => {
    await flush();
    const socket = harness.sockets.at(-1);
    if (socket === undefined) throw new Error('No socket was opened');
    socket.open();
    socket.receive({ type: 'ready' });
    return socket;
  };

  it('follows the collection instead of the page once the server is ready', async () => {
    const harness = createCollectionHarness();

    const socket = await open(harness);

    expect(socket.sentOfType('subscribe-collection')).toEqual([
      { collectionId: 'collection-1', type: 'subscribe-collection' },
    ]);
    expect(socket.sentOfType('subscribe')).toEqual([]);
  });

  it('counts as connected when the server accepts the collection', async () => {
    const harness = createCollectionHarness();
    const socket = await open(harness);

    socket.receive({ collectionId: 'collection-1', type: 'subscribed-collection' });

    expect(harness.connections).toEqual(['connected']);
  });

  it('hands the notices of the collection to its listener', async () => {
    const harness = createCollectionHarness();
    const socket = await open(harness);
    const changes = {
      collectionId: 'collection-1',
      rows: [{ id: 'row-1', version: 3 }],
      type: 'collection-changes',
      views: [],
    };

    socket.receive(changes);
    socket.receive({ collectionId: 'collection-1', type: 'collection-resync' });
    socket.receive({ collectionId: 'collection-1', type: 'collection-revoked' });

    expect(harness.events).toEqual([
      changes,
      { collectionId: 'collection-1', type: 'collection-resync' },
      { collectionId: 'collection-1', type: 'collection-revoked' },
    ]);
  });
});
