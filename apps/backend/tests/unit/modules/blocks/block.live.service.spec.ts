import { describe, expect, it } from 'bun:test';
import { Result, USER_ROLE } from '@neuma/shared';
import { z } from 'zod';
import { BlockLiveService } from '@/modules/blocks/block.live.service';
import {
  BLOCK_LIVE_CLOSE_CODE,
  BLOCK_LIVE_DEFAULT_SETTINGS,
  BLOCK_LIVE_MAX_CONNECTIONS_PER_USER,
  BLOCK_LIVE_MAX_MESSAGE_BYTES,
  BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES,
  BLOCK_LIVE_MAX_SUBSCRIPTIONS_PER_CONNECTION,
  BLOCK_LIVE_RATE_LIMIT,
} from '@/modules/blocks/constants/block.live.constants';
import { BlockAccessDeniedError } from '@/modules/blocks/domain/block.error';
import { BlockLiveUnauthorizedError } from '@/modules/blocks/domain/block.live.error';
import { InMemoryBlockPresenceStore } from '@/modules/blocks/infrastructure/presence/block.presence.store';
import { BlockLiveRegistry } from '@/modules/blocks/infrastructure/registry/block.live.registry';
import type {
  BlockLiveBroadcaster,
  BlockLivePageAccess,
  BlockLiveRequestAnswerer,
  BlockLiveSettings,
  BlockLiveSocket,
  BlockLiveSocketHandler,
  BlockLiveTokenVerifier,
} from '@/modules/blocks/types/block.live.types';
import type { BlockReader } from '@/modules/blocks/types/blocks.types';

const SPACE_ID = 'space-1';
const SETTLE_MS = 60;

const readerOf = (userId: string): BlockReader => ({ role: USER_ROLE.WORKER, userId, workspaceId: 'workspace-1' });

const tokenVerifier: BlockLiveTokenVerifier = {
  verify: (token) =>
    Promise.resolve(
      token.startsWith('good:')
        ? Result.ok(readerOf(token.slice('good:'.length)))
        : Result.fail(new BlockLiveUnauthorizedError()),
    ),
};

interface Harness {
  readonly broadcasts: string[];
  readonly open: (userId?: string) => Promise<FakeConnection>;
  readonly service: BlockLiveService;
}

interface FakeConnection {
  readonly closed: () => { code: number; reason: string } | null;
  readonly handler: BlockLiveSocketHandler;
  readonly receive: (message: object) => Promise<void>;
  readonly sent: () => readonly Record<string, unknown>[];
}

const sentMessageSchema = z.record(z.string(), z.unknown());

const buildSocket = (): {
  closed: () => { code: number; reason: string } | null;
  sent: Record<string, unknown>[];
  socket: BlockLiveSocket;
} => {
  const sent: Record<string, unknown>[] = [];
  let closed: { code: number; reason: string } | null = null;
  return {
    closed: () => closed,
    sent,
    socket: {
      close: (code, reason) => {
        closed = { code, reason };
      },
      send: (text) => {
        sent.push(sentMessageSchema.parse(JSON.parse(text)));
      },
    },
  };
};

/** Answers each request with its own id and the user it acted for, so a test can tell who was served and when. */
const echoingRequests: BlockLiveRequestAnswerer = {
  answer: (reader, message) =>
    Promise.resolve({
      kind: 'reply',
      message: { code: `${reader.userId}:${message.type}`, requestId: message.requestId, type: 'error' },
    }),
};

const buildHarness = (
  options: {
    deniedPageIds?: readonly string[];
    requests?: BlockLiveRequestAnswerer;
    settings?: Partial<BlockLiveSettings>;
  } = {},
): Harness => {
  const broadcasts: string[] = [];
  const pageAccess: BlockLivePageAccess = {
    canReadBlockInPage: (_reader, _pageId, blockId) => Promise.resolve(blockId !== 'hidden-block'),
    resolvePageAccess: (_reader, pageId) =>
      Promise.resolve(
        options.deniedPageIds?.includes(pageId) === true
          ? Result.fail(new BlockAccessDeniedError())
          : Result.ok({ spaceId: SPACE_ID }),
      ),
  };
  const broadcaster: BlockLiveBroadcaster = {
    broadcastPresence: (pageId) => {
      broadcasts.push(`broadcast:${pageId}`);
      return Promise.resolve();
    },
    sendPresenceTo: (_connectionId, pageId) => {
      broadcasts.push(`snapshot:${pageId}`);
      return Promise.resolve();
    },
  };
  const settings = { ...BLOCK_LIVE_DEFAULT_SETTINGS, ...options.settings };
  const service = new BlockLiveService(
    new BlockLiveRegistry(),
    tokenVerifier,
    pageAccess,
    broadcaster,
    new InMemoryBlockPresenceStore(settings.presenceTimeToLiveMs),
    options.requests ?? echoingRequests,
    settings,
    { error: () => undefined },
  );
  const open = async (userId = 'user-1'): Promise<FakeConnection> => {
    const { closed, sent, socket } = buildSocket();
    const handler = service.openConnection(socket);
    const receive = (message: object): Promise<void> => handler.handleMessage(JSON.stringify(message));
    await receive({ token: `good:${userId}`, type: 'auth' });
    return { closed, handler, receive, sent: () => sent };
  };
  return { broadcasts, open, service };
};

const openUnauthenticated = (
  harness: Harness,
): ReturnType<typeof buildSocket> & { handler: BlockLiveSocketHandler } => {
  const built = buildSocket();
  return { ...built, handler: harness.service.openConnection(built.socket) };
};

describe('BlockLiveService', () => {
  describe('authentication', () => {
    it('answers ready once the token is accepted', async () => {
      const connection = await buildHarness().open();

      expect(connection.sent()).toEqual([{ type: 'ready' }]);
      expect(connection.closed()).toBeNull();
    });

    it('closes a socket whose first message is not auth', async () => {
      const unauthenticated = openUnauthenticated(buildHarness());

      await unauthenticated.handler.handleMessage(JSON.stringify({ pageId: 'page-1', type: 'subscribe' }));

      expect(unauthenticated.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });

    it('closes a socket whose token is refused', async () => {
      const unauthenticated = openUnauthenticated(buildHarness());

      await unauthenticated.handler.handleMessage(JSON.stringify({ token: 'forged', type: 'auth' }));

      expect(unauthenticated.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });

    it('closes a socket that never authenticates', async () => {
      const harness = buildHarness({ settings: { authTimeoutMs: 20 } });
      const unauthenticated = openUnauthenticated(harness);

      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

      expect(unauthenticated.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
    });

    it('refuses a second auth on an authenticated socket without closing it', async () => {
      const connection = await buildHarness().open();

      await connection.receive({ token: 'good:user-2', type: 'auth' });

      expect(connection.sent().at(-1)).toEqual({ code: 'already-authenticated', type: 'error' });
      expect(connection.closed()).toBeNull();
    });

    it('closes the connection that goes over the sockets a user may hold', async () => {
      const harness = buildHarness();
      const accepted = await Promise.all(
        Array.from({ length: BLOCK_LIVE_MAX_CONNECTIONS_PER_USER }, () => harness.open('user-1')),
      );

      const extra = await harness.open('user-1');
      const other = await harness.open('user-2');

      expect(accepted.every((connection) => connection.closed() === null)).toBe(true);
      expect(extra.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.tooManyConnections);
      expect(other.closed()).toBeNull();
    });

    it('frees the place of a user when a socket closes', async () => {
      const harness = buildHarness();
      const connections = await Promise.all(
        Array.from({ length: BLOCK_LIVE_MAX_CONNECTIONS_PER_USER }, () => harness.open('user-1')),
      );
      connections[0]?.handler.handleClose();

      const replacement = await harness.open('user-1');

      expect(replacement.closed()).toBeNull();
    });
  });

  describe('messages', () => {
    it('answers an invalid message with an error and keeps the socket open', async () => {
      const harness = buildHarness();
      const connection = await harness.open();

      await connection.handler.handleMessage('not json');

      expect(connection.sent().at(-1)).toEqual({ code: 'invalid-message', type: 'error' });
      expect(connection.closed()).toBeNull();
    });

    it('answers ping with pong', async () => {
      const connection = await buildHarness().open();

      await connection.receive({ type: 'ping' });

      expect(connection.sent().at(-1)).toEqual({ type: 'pong' });
    });

    it('closes a socket that sends more messages than the limit allows', async () => {
      const connection = await buildHarness().open();

      for (let index = 0; index < BLOCK_LIVE_RATE_LIMIT.maxMessages + 1; index += 1) {
        await connection.receive({ type: 'ping' });
      }

      expect(connection.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.policyViolation);
    });

    it('closes a socket that stays silent for longer than the idle timeout', async () => {
      const harness = buildHarness({ settings: { idleTimeoutMs: 20 } });
      const connection = await harness.open();

      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

      expect(connection.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.idle);
    });

    it('closes a socket that reached its maximum age, even while it keeps sending', async () => {
      const harness = buildHarness({ settings: { maxConnectionAgeMs: 40 } });
      const connection = await harness.open();

      for (let index = 0; index < 4; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        await connection.receive({ type: 'ping' });
      }

      expect(connection.closed()).not.toBeNull();
      expect(connection.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.reconnectRequired);
    });

    it('keeps a socket open while it keeps sending', async () => {
      const harness = buildHarness({ settings: { idleTimeoutMs: 40 } });
      const connection = await harness.open();

      for (let index = 0; index < 4; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 15));
        await connection.receive({ type: 'ping' });
      }

      expect(connection.closed()).toBeNull();
    });
  });

  describe('subscriptions', () => {
    it('subscribes to a page the user can read and sends the presence already there', async () => {
      const harness = buildHarness();
      const connection = await harness.open();

      await connection.receive({ pageId: 'page-1', type: 'subscribe' });

      expect(connection.sent().at(-1)).toEqual({ pageId: 'page-1', type: 'subscribed' });
      expect(harness.broadcasts).toEqual(['snapshot:page-1']);
    });

    it('refuses a page the user cannot read with an error and no subscription', async () => {
      const harness = buildHarness({ deniedPageIds: ['page-hidden'] });
      const connection = await harness.open();

      await connection.receive({ pageId: 'page-hidden', type: 'subscribe' });
      await connection.receive({ blockId: null, pageId: 'page-hidden', type: 'presence' });

      expect(connection.sent().slice(1)).toEqual([
        { code: 'access-denied', pageId: 'page-hidden', type: 'error' },
        { code: 'not-subscribed', pageId: 'page-hidden', type: 'error' },
      ]);
    });

    it('does not count a repeated subscription twice', async () => {
      const harness = buildHarness();
      const connection = await harness.open();

      for (let index = 0; index < BLOCK_LIVE_MAX_SUBSCRIPTIONS_PER_CONNECTION + 3; index += 1) {
        await connection.receive({ pageId: 'page-1', type: 'subscribe' });
      }

      expect(connection.sent().filter((message) => message.type === 'error')).toEqual([]);
    });

    it('refuses the subscription that goes over the cap and keeps the others', async () => {
      const harness = buildHarness();
      const connection = await harness.open();

      for (let index = 0; index < BLOCK_LIVE_MAX_SUBSCRIPTIONS_PER_CONNECTION; index += 1) {
        await connection.receive({ pageId: `page-${String(index)}`, type: 'subscribe' });
      }
      await connection.receive({ pageId: 'page-over', type: 'subscribe' });
      await connection.receive({ pageId: 'page-0', type: 'subscribe' });

      const messages = connection.sent();
      expect(messages.at(-2)).toEqual({ code: 'too-many-subscriptions', pageId: 'page-over', type: 'error' });
      expect(messages.at(-1)).toEqual({ pageId: 'page-0', type: 'subscribed' });
    });

    it('makes room again after an unsubscribe', async () => {
      const harness = buildHarness();
      const connection = await harness.open();
      for (let index = 0; index < BLOCK_LIVE_MAX_SUBSCRIPTIONS_PER_CONNECTION; index += 1) {
        await connection.receive({ pageId: `page-${String(index)}`, type: 'subscribe' });
      }

      await connection.receive({ pageId: 'page-0', type: 'unsubscribe' });
      await connection.receive({ pageId: 'page-new', type: 'subscribe' });

      expect(connection.sent().at(-1)).toEqual({ pageId: 'page-new', type: 'subscribed' });
    });
  });

  describe('presence', () => {
    it('broadcasts a presence message from a subscribed socket', async () => {
      const harness = buildHarness();
      const connection = await harness.open();
      await connection.receive({ pageId: 'page-1', type: 'subscribe' });

      await connection.receive({ blockId: 'block-1', pageId: 'page-1', type: 'presence' });

      expect(harness.broadcasts.at(-1)).toBe('broadcast:page-1');
    });

    it('refuses presence on a block the sender cannot read', async () => {
      const harness = buildHarness();
      const connection = await harness.open();
      await connection.receive({ pageId: 'page-1', type: 'subscribe' });

      await connection.receive({ blockId: 'hidden-block', pageId: 'page-1', type: 'presence' });

      expect(connection.sent().at(-1)).toEqual({ code: 'access-denied', pageId: 'page-1', type: 'error' });
      expect(harness.broadcasts).toEqual(['snapshot:page-1']);
    });

    it('removes the presence of a socket that unsubscribes or closes', async () => {
      const harness = buildHarness();
      const connection = await harness.open();
      await connection.receive({ pageId: 'page-1', type: 'subscribe' });
      await connection.receive({ pageId: 'page-2', type: 'subscribe' });
      await connection.receive({ blockId: null, pageId: 'page-1', type: 'presence' });
      await connection.receive({ blockId: null, pageId: 'page-2', type: 'presence' });
      harness.broadcasts.length = 0;

      await connection.receive({ pageId: 'page-1', type: 'unsubscribe' });
      connection.handler.handleClose();

      expect(harness.broadcasts).toEqual(['broadcast:page-1', 'broadcast:page-2']);
    });
  });

  describe('requests', () => {
    const buildTransactionsRequest = (requestId: string, weight = 0): object => ({
      requestId,
      transactions: [{ id: 'transaction-1', operations: [{ filler: 'x'.repeat(weight) }], spaceId: SPACE_ID }],
      type: 'transactions',
    });

    it('answers a sync request to the socket that asked, as the user of that socket', async () => {
      const harness = buildHarness();
      const asker = await harness.open('user-1');
      const bystander = await harness.open('user-2');

      await asker.receive({ pageId: 'page-1', requestId: 'request-1', type: 'sync' });

      expect(asker.sent().at(-1)).toEqual({ code: 'user-1:sync', requestId: 'request-1', type: 'error' });
      expect(bystander.sent()).toEqual([{ type: 'ready' }]);
    });

    it('processes the requests of one socket in the order they arrive, even when the first is slower', async () => {
      const finished: string[] = [];
      const slowFirst: BlockLiveRequestAnswerer = {
        answer: async (_reader, message) => {
          await new Promise((resolve) => setTimeout(resolve, message.requestId === 'first' ? SETTLE_MS : 0));
          finished.push(message.requestId);
          return { kind: 'reply', message: { code: 'done', requestId: message.requestId, type: 'error' } };
        },
      };
      const connection = await buildHarness({ requests: slowFirst }).open();

      await Promise.all([
        connection.receive(buildTransactionsRequest('first')),
        connection.receive(buildTransactionsRequest('second')),
      ]);

      expect(finished).toEqual(['first', 'second']);
      expect(
        connection
          .sent()
          .slice(1)
          .map((message) => message.requestId),
      ).toEqual(['first', 'second']);
    });

    it('lets different sockets run their requests at the same time', async () => {
      const running = new Set<string>();
      let mostAtOnce = 0;
      const tracked: BlockLiveRequestAnswerer = {
        answer: async (reader, message) => {
          running.add(reader.userId);
          mostAtOnce = Math.max(mostAtOnce, running.size);
          await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
          running.delete(reader.userId);
          return { kind: 'reply', message: { code: 'done', requestId: message.requestId, type: 'error' } };
        },
      };
      const harness = buildHarness({ requests: tracked });
      const first = await harness.open('user-1');
      const second = await harness.open('user-2');

      await Promise.all([
        first.receive(buildTransactionsRequest('request-1')),
        second.receive(buildTransactionsRequest('request-2')),
      ]);

      expect(mostAtOnce).toBe(2);
    });

    it('closes the socket with 4401 when the account behind it is no longer active', async () => {
      const inactive: BlockLiveRequestAnswerer = { answer: () => Promise.resolve({ kind: 'inactive' }) };
      const connection = await buildHarness({ requests: inactive }).open();

      await connection.receive(buildTransactionsRequest('request-1'));

      expect(connection.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.unauthorized);
      expect(connection.sent()).toEqual([{ type: 'ready' }]);
    });

    it('accepts a request above the small limit and closes anything else above it with 1009', async () => {
      const harness = buildHarness();
      const sender = await harness.open();
      const offender = await harness.open('user-2');

      await sender.receive(buildTransactionsRequest('request-1', BLOCK_LIVE_MAX_MESSAGE_BYTES * 2));
      await offender.receive({ filler: 'x'.repeat(BLOCK_LIVE_MAX_MESSAGE_BYTES), type: 'ping' });

      expect(sender.closed()).toBeNull();
      expect(sender.sent().at(-1)).toEqual({ code: 'user-1:transactions', requestId: 'request-1', type: 'error' });
      expect(offender.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.messageTooBig);
    });

    it('closes with 1009 a request above the request limit', async () => {
      const connection = await buildHarness().open();

      await connection.receive(buildTransactionsRequest('request-1', BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES));

      expect(connection.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.messageTooBig);
    });

    it('closes with 1009 a socket that sends a large message before authenticating', async () => {
      const unauthenticated = openUnauthenticated(buildHarness());

      await unauthenticated.handler.handleMessage(
        JSON.stringify(buildTransactionsRequest('r', BLOCK_LIVE_MAX_MESSAGE_BYTES)),
      );

      expect(unauthenticated.closed()?.code).toBe(BLOCK_LIVE_CLOSE_CODE.messageTooBig);
    });
  });
});
