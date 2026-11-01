import websocket, { type WebsocketHandler } from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import {
  BLOCK_LIVE_CLOSE_CODE,
  BLOCK_LIVE_MAX_BUFFERED_BYTES,
  BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES,
  BLOCK_LIVE_PATH,
  BLOCK_LIVE_SOCKET_OPEN_STATE,
} from '../../constants/block.live.constants';
import type {
  BlockLiveConnectionOpener,
  BlockLiveRawSocketMessage,
  BlockLiveSocket,
  BlockLiveWritableSocket,
} from '../../types/block.live.types';

const readMessageBytes = (message: BlockLiveRawSocketMessage): Buffer => {
  if (Array.isArray(message)) return Buffer.concat(message);
  return message instanceof ArrayBuffer ? Buffer.from(message) : message;
};

/**
 * A send after the socket started closing is dropped, not thrown. A client that lets the frames pile up unread is
 * closed, so one slow reader cannot make the server hold everything that is published meanwhile.
 */
export const toLiveSocket = (socket: BlockLiveWritableSocket): BlockLiveSocket => ({
  close: (code, reason) => {
    socket.close(code, reason);
  },
  send: (text) => {
    if (socket.readyState !== BLOCK_LIVE_SOCKET_OPEN_STATE) return;
    if (socket.bufferedAmount > BLOCK_LIVE_MAX_BUFFERED_BYTES) {
      socket.close(BLOCK_LIVE_CLOSE_CODE.policyViolation, 'slow-consumer');
      return;
    }
    socket.send(text);
  },
});

const createLiveHandler =
  (openConnection: BlockLiveConnectionOpener): WebsocketHandler =>
  (socket): void => {
    const handler = openConnection(toLiveSocket(socket));
    socket.on('message', (message: BlockLiveRawSocketMessage, isBinary: boolean) => {
      if (isBinary) {
        socket.close(BLOCK_LIVE_CLOSE_CODE.policyViolation, 'binary-frames-not-supported');
        return;
      }
      const bytes = readMessageBytes(message);
      // Bun's `ws` ignores `maxPayload`, so the limit is enforced here as well. The service applies the small limit
      // to every message that is not a request.
      if (bytes.byteLength > BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES) {
        socket.close(BLOCK_LIVE_CLOSE_CODE.messageTooBig, 'message-too-big');
        return;
      }
      void handler.handleMessage(bytes.toString('utf8'));
    });
    socket.on('close', () => {
      handler.handleClose();
    });
  };

export const registerBlockLiveTransport = async (
  fastify: FastifyInstance,
  openConnection: BlockLiveConnectionOpener,
): Promise<void> => {
  await fastify.register(websocket, { options: { maxPayload: BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES } });
  fastify.get(BLOCK_LIVE_PATH, { websocket: true }, createLiveHandler(openConnection));
};
