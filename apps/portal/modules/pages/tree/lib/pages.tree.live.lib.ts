import { BLOCK_SYNC_CLOSE_CODE, BLOCK_SYNC_PING_INTERVAL_MS } from '../../block-sync/constants/block-sync.constants';
import type { BlockLiveSocket } from '../../block-sync/types/block-sync.types';
import { computeCollaborationReconnectDelayMs } from '../../lib/pages.collaboration.lib';
import { pageTreeLiveMessageSchema } from '../schemas/pages.tree.schemas';
import type { PageTreeLiveMessage, PageTreeLiveSession, PageTreeLiveSessionOptions } from '../types/pages.tree.types';

export const parsePageTreeLiveMessage = (text: string): PageTreeLiveMessage | null => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = pageTreeLiveMessageSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

/**
 * One socket on the live channel that follows the page tree of some spaces (ADR 030). It never carries a page: it names
 * the parents whose children changed, so the sidebar reads those again. A connection that dropped may have missed
 * some, so coming back reads everything open again.
 */
export const createPageTreeLiveSession = ({
  handlers,
  openSocket,
  requestToken,
  spaceIds,
  url,
  watermarks,
}: PageTreeLiveSessionOptions): PageTreeLiveSession => {
  let socket: BlockLiveSocket | null = null;
  let isDestroyed = false;
  let hasConnected = false;
  let isSocketAnnounced = false;
  let attempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const send = (message: Record<string, unknown>): void => socket?.send(JSON.stringify(message));

  /** Only the first subscription carries the render: a reconnection reads everything open again anyway. */
  const buildSubscription = (spaceId: string): Record<string, unknown> => {
    const since = hasConnected ? undefined : watermarks[spaceId];
    return since === undefined ? { spaceId, type: 'subscribe-tree' } : { since, spaceId, type: 'subscribe-tree' };
  };

  const stopPing = (): void => {
    if (pingTimer !== null) clearInterval(pingTimer);
    pingTimer = null;
  };

  const handleSubscribed = (): void => {
    attempts = 0;
    if (pingTimer === null) pingTimer = setInterval(() => send({ type: 'ping' }), BLOCK_SYNC_PING_INTERVAL_MS);
    if (isSocketAnnounced) return;
    isSocketAnnounced = true;
    if (hasConnected) handlers.onReconnected();
    hasConnected = true;
  };

  const handleMessage = (text: string): void => {
    const message = parsePageTreeLiveMessage(text);
    if (message === null) return;
    switch (message.type) {
      case 'ready':
        for (const spaceId of spaceIds) send(buildSubscription(spaceId));
        return;
      case 'subscribed-tree':
        handleSubscribed();
        return;
      case 'tree-changed':
        handlers.onChanged(message.spaceId, message.parentIds);
        return;
      case 'tree-resync':
        handlers.onResync(message.spaceId);
        return;
      default:
        return;
    }
  };

  const scheduleReconnect = (): void => {
    if (isDestroyed) return;
    attempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, computeCollaborationReconnectDelayMs(attempts));
  };

  const handleClose = (closed: BlockLiveSocket, code: number): void => {
    if (socket !== closed || isDestroyed) return;
    socket = null;
    stopPing();
    if (code === BLOCK_SYNC_CLOSE_CODE.unauthorized) return;
    if (code === BLOCK_SYNC_CLOSE_CODE.reconnectRequired) {
      void connect();
      return;
    }
    scheduleReconnect();
  };

  const fetchToken = async (): Promise<string | null> => {
    try {
      return await requestToken();
    } catch {
      return null;
    }
  };

  const connect = async (): Promise<void> => {
    if (isDestroyed) return;
    const token = await fetchToken();
    if (isDestroyed) return;
    if (token === null) {
      scheduleReconnect();
      return;
    }
    const opened = openSocket(url);
    socket = opened;
    isSocketAnnounced = false;
    opened.listen({
      onClose: (code) => handleClose(opened, code),
      onMessage: handleMessage,
      onOpen: () => send({ token, type: 'auth' }),
    });
  };

  void connect();

  return {
    destroy: () => {
      isDestroyed = true;
      stopPing();
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      socket?.close();
      socket = null;
    },
  };
};
