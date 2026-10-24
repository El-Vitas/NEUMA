import { computeCollaborationReconnectDelayMs } from '../../lib/pages.collaboration.lib';
import type { BlockLiveSocket, LiveSocketLoop, LiveSocketLoopOptions } from '../types/block-sync.types';

/**
 * What the three live sockets (page, page tree, inbox) share: a fresh token for every connection, the auth message,
 * the pings, and the growing pause between attempts. What each one says over the socket stays with the session.
 */
export const createLiveSocketLoop = (options: LiveSocketLoopOptions): LiveSocketLoop => {
  let socket: BlockLiveSocket | null = null;
  let isDestroyed = false;
  let attempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const send = (message: Record<string, unknown>): void => socket?.send(JSON.stringify(message));

  const stopPing = (): void => {
    if (pingTimer === null) return;
    clearInterval(pingTimer);
    pingTimer = null;
  };

  const fetchToken = async (): Promise<string | null> => {
    try {
      return await options.requestToken();
    } catch {
      return null;
    }
  };

  const reconnectLater = (minimumDelayMs = 0): void => {
    if (isDestroyed) return;
    attempts += 1;
    options.onReconnectScheduled?.();
    const delay = Math.max(computeCollaborationReconnectDelayMs(attempts), minimumDelayMs);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  };

  const handleClose = (closed: BlockLiveSocket, code: number): void => {
    if (socket !== closed || isDestroyed) return;
    socket = null;
    stopPing();
    options.onClosed(code, loop);
  };

  const connect = async (): Promise<void> => {
    if (isDestroyed) return;
    options.onConnectStart?.(attempts);
    const token = await fetchToken();
    if (isDestroyed) return;
    if (token === null) {
      reconnectLater();
      return;
    }
    const opened = options.openSocket(options.url);
    socket = opened;
    options.onSocketOpened?.();
    opened.listen({
      onClose: (code) => handleClose(opened, code),
      onMessage: options.onMessage,
      onOpen: () => send({ token, type: 'auth' }),
    });
  };

  const reconnectForced = (): void => {
    if (attempts > 0) {
      reconnectLater();
      return;
    }
    attempts = 1;
    void connect();
  };

  const markReady = (): void => {
    attempts = 0;
    stopPing();
    pingTimer = setInterval(() => send({ type: 'ping' }), options.pingIntervalMs);
  };

  const loop: LiveSocketLoop = {
    connect,
    destroy: () => {
      isDestroyed = true;
      stopPing();
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      socket?.close();
      socket = null;
    },
    markReady,
    reconnectForced,
    reconnectLater,
    send,
    stopPing,
  };
  return loop;
};
