import type { BlockLiveSocket } from '../types/block-sync.types';

/** The browser WebSocket seen as the session needs it. A failed connection closes it, so errors need no handler. */
export const openBrowserBlockLiveSocket = (url: string): BlockLiveSocket => {
  const socket = new WebSocket(url);
  return {
    close: (code) => socket.close(code),
    listen: (handlers) => {
      socket.addEventListener('open', handlers.onOpen);
      socket.addEventListener('message', (event: MessageEvent) => {
        if (typeof event.data === 'string') handlers.onMessage(event.data);
      });
      socket.addEventListener('close', (event: CloseEvent) => handlers.onClose(event.code));
    },
    send: (text) => socket.send(text),
  };
};
