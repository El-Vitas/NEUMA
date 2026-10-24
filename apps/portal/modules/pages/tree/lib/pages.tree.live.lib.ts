import { BLOCK_SYNC_CLOSE_CODE, BLOCK_SYNC_PING_INTERVAL_MS } from '../../block-sync/constants/block-sync.constants';
import { createLiveSocketLoop } from '../../block-sync/lib/block-sync.live-socket.lib';
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
  let hasConnected = false;
  let isSocketAnnounced = false;

  /** Only the first subscription carries the render: a reconnection reads everything open again anyway. */
  const buildSubscription = (spaceId: string): Record<string, unknown> => {
    const since = hasConnected ? undefined : watermarks[spaceId];
    return since === undefined ? { spaceId, type: 'subscribe-tree' } : { since, spaceId, type: 'subscribe-tree' };
  };

  const handleSubscribed = (): void => {
    loop.markReady();
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

  const loop = createLiveSocketLoop({
    onClosed: (code, closedLoop) => {
      if (code === BLOCK_SYNC_CLOSE_CODE.unauthorized) return;
      if (code === BLOCK_SYNC_CLOSE_CODE.reconnectRequired) closedLoop.reconnectForced();
      else closedLoop.reconnectLater();
    },
    onMessage: handleMessage,
    onSocketOpened: () => {
      isSocketAnnounced = false;
    },
    openSocket,
    pingIntervalMs: BLOCK_SYNC_PING_INTERVAL_MS,
    requestToken,
    url,
  });
  const send = loop.send;

  void loop.connect();

  return { destroy: loop.destroy };
};
