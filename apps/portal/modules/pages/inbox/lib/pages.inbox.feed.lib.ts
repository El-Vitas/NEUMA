import { createLiveSocketLoop } from '../../block-sync/lib/block-sync.live-socket.lib';
import { INBOX_PING_INTERVAL_MS } from '../constants/pages.inbox.constants';
import { inboxFeedMessageSchema } from '../schemas/pages.inbox.schemas';
import type { PagesInboxFeed, PagesInboxFeedOptions } from '../types/pages.inbox.types';

const parseMessage = (text: string): ReturnType<typeof inboxFeedMessageSchema.safeParse> => {
  try {
    return inboxFeedMessageSchema.safeParse(JSON.parse(text));
  } catch {
    return inboxFeedMessageSchema.safeParse(undefined);
  }
};

/**
 * One socket to the live channel for the person, with no page: the notifications of a person reach every socket
 * they have open. Each connection asks for a fresh token. A closed socket is opened again with a growing pause,
 * and every opening says so, because what was sent in between is lost.
 */
export const createPagesInboxFeed = ({
  onConnected,
  onNotification,
  openSocket,
  requestToken,
  url,
}: PagesInboxFeedOptions): PagesInboxFeed => {
  const handleMessage = (text: string): void => {
    const message = parseMessage(text);
    if (!message.success) return;
    if (message.data.type === 'notification') {
      onNotification();
      return;
    }
    loop.markReady();
    onConnected();
  };

  const loop = createLiveSocketLoop({
    onClosed: (_code, closedLoop) => closedLoop.reconnectLater(),
    onMessage: handleMessage,
    openSocket,
    pingIntervalMs: INBOX_PING_INTERVAL_MS,
    requestToken,
    url,
  });

  void loop.connect();

  return { destroy: loop.destroy };
};
