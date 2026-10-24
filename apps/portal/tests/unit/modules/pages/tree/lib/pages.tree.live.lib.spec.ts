import { describe, expect, it } from 'bun:test';
import { createPageTreeLiveSession, parsePageTreeLiveMessage } from '@/modules/pages/tree/lib/pages.tree.live.lib';
import { buildFakeLiveSocket, type FakeLiveSocket } from '../../stubs/pages.tree.live.stubs';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const openSession = async (spaceIds: readonly string[], watermarks: Readonly<Record<string, string>> = {}) => {
  const sockets: FakeLiveSocket[] = [];
  const events: string[] = [];
  const session = createPageTreeLiveSession({
    handlers: {
      onChanged: (spaceId, parentIds) => events.push(`changed:${spaceId}:${parentIds.map(String).join(',')}`),
      onReconnected: () => events.push('reconnected'),
      onResync: (spaceId) => events.push(`resync:${spaceId}`),
    },
    openSocket: () => {
      const socket = buildFakeLiveSocket();
      sockets.push(socket);
      return socket;
    },
    requestToken: () => Promise.resolve('token-1'),
    spaceIds,
    url: 'ws://live',
    watermarks,
  });
  await flush();
  return { events, session, sockets };
};

const say = (socket: FakeLiveSocket, message: object): void => socket.handlers?.onMessage(JSON.stringify(message));

describe('parsePageTreeLiveMessage', () => {
  it('reads the messages of the tree and nothing else', () => {
    expect(parsePageTreeLiveMessage('{"parentIds":[null,"a"],"spaceId":"s","type":"tree-changed"}')).toEqual({
      parentIds: [null, 'a'],
      spaceId: 's',
      type: 'tree-changed',
    });
    expect(parsePageTreeLiveMessage('{"pageId":"p","type":"resync"}')).toBeNull();
    expect(parsePageTreeLiveMessage('not json')).toBeNull();
  });
});

describe('createPageTreeLiveSession', () => {
  it('authenticates when the socket opens and follows every space when the server is ready', async () => {
    const { sockets } = await openSession(['s1', 's2']);
    const [socket] = sockets;

    socket?.handlers?.onOpen();
    if (socket !== undefined) say(socket, { type: 'ready' });

    expect(socket?.sent).toEqual([
      { token: 'token-1', type: 'auth' },
      { spaceId: 's1', type: 'subscribe-tree' },
      { spaceId: 's2', type: 'subscribe-tree' },
    ]);
  });

  it('tells the server what the render it holds was read at, so it can say what came after', async () => {
    const { sockets } = await openSession(['s1', 's2'], { s1: '120' });
    const [socket] = sockets;

    socket?.handlers?.onOpen();
    if (socket !== undefined) say(socket, { type: 'ready' });

    expect(socket?.sent).toEqual([
      { token: 'token-1', type: 'auth' },
      { since: '120', spaceId: 's1', type: 'subscribe-tree' },
      { spaceId: 's2', type: 'subscribe-tree' },
    ]);
  });

  it('does not repeat it after a reconnection, which reads everything again anyway', async () => {
    const { sockets } = await openSession(['s1'], { s1: '120' });
    const first = sockets[0];
    if (first === undefined) throw new Error('No socket was opened');
    say(first, { spaceId: 's1', type: 'subscribed-tree' });

    first.handlers?.onClose(4410);
    await flush();
    const second = sockets[1];
    second?.handlers?.onOpen();
    if (second !== undefined) say(second, { type: 'ready' });

    expect(second?.sent).toEqual([
      { token: 'token-1', type: 'auth' },
      { spaceId: 's1', type: 'subscribe-tree' },
    ]);
  });

  it('hands the changes and the resyncs to the sidebar', async () => {
    const { events, sockets } = await openSession(['s1']);
    const socket = sockets[0];
    if (socket === undefined) throw new Error('No socket was opened');

    say(socket, { spaceId: 's1', type: 'subscribed-tree' });
    say(socket, { parentIds: [null, 'a'], spaceId: 's1', type: 'tree-changed' });
    say(socket, { spaceId: 's1', type: 'tree-resync' });

    expect(events).toEqual(['changed:s1:null,a', 'resync:s1']);
  });

  it('says it came back once after a connection that dropped, not once for each space it follows', async () => {
    const { events, sockets } = await openSession(['s1', 's2']);
    const first = sockets[0];
    if (first === undefined) throw new Error('No socket was opened');
    say(first, { spaceId: 's1', type: 'subscribed-tree' });
    say(first, { spaceId: 's2', type: 'subscribed-tree' });
    expect(events).toEqual([]);

    first.handlers?.onClose(4410);
    await flush();
    const second = sockets[1];
    if (second === undefined) throw new Error('No second socket was opened');
    say(second, { spaceId: 's1', type: 'subscribed-tree' });
    say(second, { spaceId: 's2', type: 'subscribed-tree' });

    expect(events).toEqual(['reconnected']);
  });

  it('does not come back after it was told it is not allowed', async () => {
    const { sockets } = await openSession(['s1']);

    sockets[0]?.handlers?.onClose(4401);
    await flush();

    expect(sockets).toHaveLength(1);
  });

  it('closes the socket when it is destroyed', async () => {
    const { session, sockets } = await openSession(['s1']);

    session.destroy();

    expect(sockets[0]?.isClosed).toBe(true);
  });
});
