import websocket, { type WebsocketHandler } from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { MAX_COLLABORATION_MESSAGE_BYTES, MESSAGE_TOO_BIG_CLOSE_CODE } from './constants/collaboration.constants';
import type { CollaborationConnectionOpener, CollaborationSocketMessage } from './types/collaboration.types';

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

const readMessageBytes = (message: CollaborationSocketMessage): Uint8Array => {
  if (Array.isArray(message)) return Buffer.concat(message);
  return message instanceof ArrayBuffer ? new Uint8Array(message) : message;
};

/** Without forwarding every socket message, the connection looks open but never receives anything. */
const createCollaborationHandler =
  (openConnection: CollaborationConnectionOpener): WebsocketHandler =>
  (socket, request): void => {
    const connection = openConnection(socket, createWebRequest(request));
    socket.on('message', (message: CollaborationSocketMessage) => {
      const bytes = readMessageBytes(message);
      // Bun's `ws` ignores `maxPayload`, so the limit is enforced here as well.
      if (bytes.byteLength > MAX_COLLABORATION_MESSAGE_BYTES) {
        socket.close(MESSAGE_TOO_BIG_CLOSE_CODE, 'message too big');
        return;
      }
      connection.handleMessage(bytes);
    });
    socket.on('close', (code: number, reason: Buffer) => {
      connection.handleClose({ code, reason: reason.toString() });
    });
  };

export const registerCollaborationTransport = async (
  fastify: FastifyInstance,
  openConnection: CollaborationConnectionOpener,
): Promise<void> => {
  await fastify.register(websocket, { options: { maxPayload: MAX_COLLABORATION_MESSAGE_BYTES } });
  fastify.get('/api/v1/collaboration', { websocket: true }, createCollaborationHandler(openConnection));
};
