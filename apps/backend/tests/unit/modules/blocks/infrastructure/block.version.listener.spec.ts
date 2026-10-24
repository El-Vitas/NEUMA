import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import {
  BLOCK_LIVE_DEFAULT_SETTINGS,
  BLOCK_LIVE_HEARTBEAT_CHANNEL,
} from '@/modules/blocks/constants/block.live.constants';
import { BlockVersionListener } from '@/modules/blocks/infrastructure/listener/block.version.listener';
import type {
  BlockListenClient,
  BlockLiveSettings,
  BlockVersionListenerHandlers,
} from '@/modules/blocks/types/block.live.types';

const SETTINGS: BlockLiveSettings = {
  ...BLOCK_LIVE_DEFAULT_SETTINGS,
  heartbeatIntervalMs: 1000,
  heartbeatTimeoutMs: 400,
  reconnectInitialDelayMs: 100,
};

type Notification = { readonly channel: string; readonly payload?: string };

/** A listen connection that can be told to go silently dead: it takes queries and says nothing back. */
class FakeClient implements BlockListenClient {
  readonly queries: { readonly text: string; readonly values: readonly unknown[] }[] = [];
  isEnded = false;
  isDead = false;
  private notificationHandler: ((message: Notification) => void) | null = null;

  onNotification(handler: (message: Notification) => void): void {
    this.notificationHandler = handler;
  }

  onError(): void {
    // The silent connection never raises one.
  }

  onEnd(): void {
    // Nor does it end by itself.
  }

  connect(): Promise<void> {
    return Promise.resolve();
  }

  query(text: string, values: readonly unknown[] = []): Promise<unknown> {
    this.queries.push({ text, values });
    if (this.isDead) return new Promise(() => undefined);
    const isHeartbeat = text.includes('pg_notify') && values[0] === BLOCK_LIVE_HEARTBEAT_CHANNEL;
    if (isHeartbeat) this.notificationHandler?.({ channel: BLOCK_LIVE_HEARTBEAT_CHANNEL, payload: String(values[1]) });
    return Promise.resolve({});
  }

  end(): Promise<void> {
    this.isEnded = true;
    return Promise.resolve();
  }

  notify(channel: string, payload: string): void {
    this.notificationHandler?.({ channel, payload });
  }
}

const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
};

const createFixture = () => {
  const clients: FakeClient[] = [];
  const errors: { readonly context: object; readonly message: string }[] = [];
  const events: string[] = [];
  const listener = new BlockVersionListener(
    { getOrThrow: () => 'postgresql://x' } as never,
    { error: (context: object, message: string) => errors.push({ context, message }) },
    SETTINGS,
    () => {
      const client = new FakeClient();
      clients.push(client);
      return client;
    },
  );
  const handlers: BlockVersionListenerHandlers = {
    onCommentEvent: (payload) => events.push(`comment ${payload}`),
    onNotification: (payload) => events.push(`version ${payload}`),
    onRecovered: () => events.push('recovered'),
  };
  return { clients, errors, events, handlers, listener };
};

describe('BlockVersionListener', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('listens to the version, comment and heartbeat channels', async () => {
    const { clients, handlers, listener } = createFixture();
    await listener.start(handlers);

    const listened = clients[0]?.queries.map((query) => query.text).filter((text) => text.startsWith('LISTEN'));

    expect(listened).toContain(`LISTEN ${BLOCK_LIVE_HEARTBEAT_CHANNEL}`);
    expect(listened).toHaveLength(3);
    await listener.stop();
  });

  it('hands each version notification to the handler', async () => {
    const { clients, events, handlers, listener } = createFixture();
    await listener.start(handlers);

    clients[0]?.notify('block_versions', '{"a":1}');

    expect(events).toEqual(['version {"a":1}']);
    await listener.stop();
  });

  it('keeps the connection while the heartbeat comes back', async () => {
    const { clients, errors, handlers, listener } = createFixture();
    await listener.start(handlers);

    jest.advanceTimersByTime(SETTINGS.heartbeatIntervalMs * 5);
    await Promise.resolve();

    expect(clients).toHaveLength(1);
    expect(errors).toEqual([]);
    await listener.stop();
  });

  it('reconnects, says so with an ERROR, and makes every subscriber read again when the connection went silent', async () => {
    const { clients, errors, events, handlers, listener } = createFixture();
    await listener.start(handlers);
    const first = clients[0];
    if (first === undefined) throw new Error('no client');

    first.isDead = true;
    jest.advanceTimersByTime(SETTINGS.heartbeatIntervalMs + SETTINGS.heartbeatTimeoutMs + 1);
    await flush();
    jest.advanceTimersByTime(SETTINGS.reconnectInitialDelayMs + 1);
    await flush();

    expect(first.isEnded).toBe(true);
    expect(clients).toHaveLength(2);
    expect(errors.map((entry) => entry.message)).toEqual(['live channel lost its listen connection']);
    const logged = (errors.at(0)?.context as { err?: Error } | undefined)?.err;
    expect(logged?.message).toContain('heartbeat');
    expect(logged?.stack).toBeDefined();
    expect(events).toContain('recovered');
    await listener.stop();
  });

  it('stops pinging once it was stopped', async () => {
    const { clients, handlers, listener } = createFixture();
    await listener.start(handlers);
    await listener.stop();
    const before = clients[0]?.queries.length ?? 0;

    jest.advanceTimersByTime(SETTINGS.heartbeatIntervalMs * 5);

    expect(clients[0]?.queries.length).toBe(before);
  });
});
