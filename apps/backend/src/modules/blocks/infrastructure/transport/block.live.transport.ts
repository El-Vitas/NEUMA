import websocket, { type WebsocketHandler } from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import {
  BLOCK_LIVE_CLOSE_CODE,
  BLOCK_LIVE_MAX_MESSAGE_BYTES,
  BLOCK_LIVE_PATH,
  BLOCK_LIVE_SOCKET_OPEN_STATE,
} from '../../constants/block.live.constants';
import type {
  BlockLiveConnectionOpener,
  BlockLiveRawSocket,
  BlockLiveRawSocketMessage,
  BlockLiveSocket,
} from '../../types/block.live.types';

const readMessageBytes = (message: BlockLiveRawSocketMessage): Buffer => {
  if (Array.isArray(message)) return Buffer.concat(message);
  return message instanceof ArrayBuffer ? Buffer.from(message) : message;
};

/** A send after the socket started closing is dropped, not thrown. */
const toLiveSocket = (socket: BlockLiveRawSocket): BlockLiveSocket => ({
  close: (code, reason) => {
    socket.close(code, reason);
  },
  send: (text) => {
    if (socket.readyState === BLOCK_LIVE_SOCKET_OPEN_STATE) socket.send(text);
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
      // Bun's `ws` ignores `maxPayload`, so the limit is enforced here as well.
      if (bytes.byteLength > BLOCK_LIVE_MAX_MESSAGE_BYTES) {
        socket.close(BLOCK_LIVE_CLOSE_CODE.messageTooBig, 'message-too-big');
        return;
      }
      void handler.handleMessage(bytes.toString('utf8'));
    });
    socket.on('close', () => {
      handler.handleClose();
    });
  };

/**
 * The Hocuspocus collaboration transport registers the websocket plugin first when it is mounted, and the plugin
 * can be registered only once, so the live channel adds only its route in that case.
 */
export const registerBlockLiveTransport = async (
  fastify: FastifyInstance,
  openConnection: BlockLiveConnectionOpener,
): Promise<void> => {
  if (!fastify.hasDecorator('websocketServer')) {
    await fastify.register(websocket, { options: { maxPayload: BLOCK_LIVE_MAX_MESSAGE_BYTES } });
  }
  fastify.get(BLOCK_LIVE_PATH, { websocket: true }, createLiveHandler(openConnection));
};
