import { describe, expect, test } from 'bun:test';
import type { WebSocketLike } from '@hocuspocus/server';
import Fastify from 'fastify';
import { registerCollaborationTransport } from '../../../../src/modules/collaboration/collaboration.transport';

describe('collaboration transport', () => {
  test('registers the websocket route and delegates the request without logging it', async () => {
    const app = Fastify();
    let delegatedRequest: Request | undefined;
    let resolveDelegation: (() => void) | undefined;
    const delegation = new Promise<void>((resolve) => {
      resolveDelegation = resolve;
    });
    const handleConnection = (_socket: WebSocketLike, request: Request): void => {
      delegatedRequest = request;
      resolveDelegation?.();
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
