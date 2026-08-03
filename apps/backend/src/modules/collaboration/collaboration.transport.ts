import websocket, { type WebsocketHandler } from '@fastify/websocket';
import type { WebSocketLike } from '@hocuspocus/server';
import type { FastifyInstance, FastifyRequest } from 'fastify';

const createWebRequest = (request: FastifyRequest): Request => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value);
    if (Array.isArray(value)) headers.set(name, value.join(', '));
  }

  const host = request.headers.host ?? request.hostname;
  const url = new URL(request.raw.url ?? '/', `${request.protocol}://${host}`);
  return new Request(url, { headers, method: request.raw.method ?? 'GET' });
};

const createCollaborationHandler =
  (handleConnection: (socket: WebSocketLike, request: Request) => void): WebsocketHandler =>
  (socket, request): void => {
    handleConnection(socket, createWebRequest(request));
  };

export const registerCollaborationTransport = async (
  fastify: FastifyInstance,
  handleConnection: (socket: WebSocketLike, request: Request) => void,
): Promise<void> => {
  await fastify.register(websocket);
  fastify.get('/api/v1/collaboration', { websocket: true }, createCollaborationHandler(handleConnection));
};
