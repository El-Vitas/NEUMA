import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import type { BlockLiveSocket, BlockLiveSocketHandlers } from '@/modules/pages/block-sync/types/block-sync.types';
import { createPagesInboxFeed } from '@/modules/pages/inbox/lib/pages.inbox.feed.lib';
import { computeCollaborationReconnectDelayMs } from '@/modules/pages/lib/pages.collaboration.lib';

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
}

const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
};

const createHarness = () => {
  const sockets: FakeSocket[] = [];
  const events: string[] = [];
  let tokenCalls = 0;
  const feed = createPagesInboxFeed({
    onConnected: () => events.push('connected'),
    onNotification: () => events.push('notification'),
    openSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    requestToken: () => {
      tokenCalls += 1;
      return Promise.resolve(`token-${String(tokenCalls)}`);
    },
    url: 'ws://live.test',
  });
  return { events, feed, sockets };
};

const connect = async (harness: ReturnType<typeof createHarness>): Promise<FakeSocket> => {
  await flush();
  const socket = harness.sockets.at(-1);
  if (socket === undefined) throw new Error('no socket was opened');
  socket.open();
  socket.receive({ type: 'ready' });
  return socket;
};

describe('createPagesInboxFeed', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens a socket, signs in with a fresh token and says it is connected once the channel is ready', async () => {
    const harness = createHarness();

    const socket = await connect(harness);

    expect(socket.sent[0]).toEqual({ token: 'token-1', type: 'auth' });
    expect(harness.events).toEqual(['connected']);
    harness.feed.destroy();
  });

  it('subscribes to no page: the notifications of a person do not belong to one', async () => {
    const harness = createHarness();

    const socket = await connect(harness);

    expect(socket.sent.some((message) => message.type === 'subscribe')).toBe(false);
    harness.feed.destroy();
  });

  it('tells of each notification that arrives and ignores the rest of what the channel says', async () => {
    const harness = createHarness();
    const socket = await connect(harness);

    socket.receive({ notificationId: 'n-1', type: 'notification' });
    socket.receive({ blockId: 'b-1', discussionId: 'd-1', pageId: 'p-1', type: 'discussion' });
    socket.receive({ type: 'pong' });

    expect(harness.events).toEqual(['connected', 'notification']);
    harness.feed.destroy();
  });

  it('opens another socket with a new token after the first one was closed, and says it is connected again', async () => {
    const harness = createHarness();
    const first = await connect(harness);

    first.closeWith(1006);
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    const second = await connect(harness);

    expect(harness.sockets).toHaveLength(2);
    expect(second.sent[0]).toEqual({ token: 'token-2', type: 'auth' });
    expect(harness.events).toEqual(['connected', 'connected']);
    harness.feed.destroy();
  });

  it('stops for good once destroyed, closing the socket and not coming back', async () => {
    const harness = createHarness();
    const socket = await connect(harness);

    harness.feed.destroy();
    socket.closeWith(1006);
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(10));
    await flush();

    expect(socket.isClosed).toBe(true);
    expect(harness.sockets).toHaveLength(1);
  });
});
