import { describe, expect, test } from 'bun:test';
import type { WebSocketLike } from '@hocuspocus/server';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerCollaborationTransport } from '../../../../src/modules/collaboration/collaboration.transport';
import { MAX_COLLABORATION_MESSAGE_BYTES } from '../../../../src/modules/collaboration/constants/collaboration.constants';
import type {
  CollaborationCloseEvent,
  CollaborationSocketConnection,
} from '../../../../src/modules/collaboration/types/collaboration.types';

const IGNORED_CONNECTION: CollaborationSocketConnection = {
  handleClose: () => undefined,
  handleMessage: () => undefined,
};

const openSocket = async (app: FastifyInstance): Promise<WebSocket> => {
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (address === null || typeof address === 'string') throw new Error('test server did not expose a port');
  const socket = new WebSocket(`ws://127.0.0.1:${String(address.port)}/api/v1/collaboration`);
  socket.binaryType = 'arraybuffer';
  await new Promise<void>((resolve) => {
    socket.addEventListener(
      'open',
      () => {
        resolve();
      },
      { once: true },
    );
  });
  return socket;
};

describe('collaboration transport', () => {
  // Hocuspocus 4 does not listen to the socket itself: without forwarding, collaboration looks connected but is dead.
  test('hands every message the client sends to the connection, byte for byte', async () => {
    const app = Fastify({ forceCloseConnections: true });
    const received: Uint8Array[] = [];
    let resolveMessage: (() => void) | undefined;
    const messageArrived = new Promise<void>((resolve) => {
      resolveMessage = resolve;
    });
    await registerCollaborationTransport(app, () => ({
      handleClose: () => undefined,
      handleMessage: (data) => {
        received.push(data);
        resolveMessage?.();
      },
    }));

    const socket = await openSocket(app);
    socket.send(new Uint8Array([0, 1, 2, 250]));
    await messageArrived;

    expect(received.map((message) => [...message])).toEqual([[0, 1, 2, 250]]);

    socket.close();
    await app.close();
  });

  test('tells the connection when the client closes, with its code and reason', async () => {
    const app = Fastify({ forceCloseConnections: true });
    let closeEvent: CollaborationCloseEvent | undefined;
    let resolveClose: (() => void) | undefined;
    const closeArrived = new Promise<void>((resolve) => {
      resolveClose = resolve;
    });
    await registerCollaborationTransport(app, () => ({
      handleClose: (event) => {
        closeEvent = event;
        resolveClose?.();
      },
      handleMessage: () => undefined,
    }));

    const socket = await openSocket(app);
    socket.close(4000, 'bye');
    await closeArrived;

    expect(closeEvent).toEqual({ code: 4000, reason: 'bye' });

    await app.close();
  });

  test('closes the socket on a message over the limit and never hands it to the connection', async () => {
    const app = Fastify({ forceCloseConnections: true });
    let messagesHandled = 0;
    let closeEvent: CollaborationCloseEvent | undefined;
    let resolveClose: (() => void) | undefined;
    const closeArrived = new Promise<void>((resolve) => {
      resolveClose = resolve;
    });
    await registerCollaborationTransport(app, () => ({
      handleClose: (event) => {
        closeEvent = event;
        resolveClose?.();
      },
      handleMessage: () => {
        messagesHandled += 1;
      },
    }));

    const socket = await openSocket(app);
    socket.send(new Uint8Array(MAX_COLLABORATION_MESSAGE_BYTES + 1));
    await closeArrived;

    expect(messagesHandled).toBe(0);
    expect(closeEvent?.code).toBe(1009);

    await app.close();
  });

  test('registers the websocket route and delegates the request without logging it', async () => {
    const app = Fastify({ forceCloseConnections: true });
    let delegatedRequest: Request | undefined;
    let resolveDelegation: (() => void) | undefined;
    const delegation = new Promise<void>((resolve) => {
      resolveDelegation = resolve;
    });
    const handleConnection = (_socket: WebSocketLike, request: Request): CollaborationSocketConnection => {
      delegatedRequest = request;
      resolveDelegation?.();
      return IGNORED_CONNECTION;
    };

    await registerCollaborationTransport(app, handleConnection);
    expect(app.printRoutes()).toContain('api/v1/collaboration');
    await app.listen({ host: '127.0.0.1', port: 0 });

    const address = app.server.address();
    if (address === null || typeof address === 'string') throw new Error('test server did not expose a port');
    const socket = new WebSocket(
      `ws://127.0.0.1:${String(address.port)}/api/v1/collaboration?documentName=page%3Apage-id&token=secret-token`,
    );
    await delegation;
    const request = delegatedRequest;

    expect(request?.url).toContain('/api/v1/collaboration?documentName=page%3Apage-id&token=secret-token');
    expect(request?.headers.get('authorization')).toBeNull();

    socket.close();
    await app.close();
  });
});
