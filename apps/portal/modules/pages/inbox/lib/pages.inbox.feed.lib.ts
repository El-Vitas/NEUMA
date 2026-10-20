import type { BlockLiveSocket } from '../../block-sync/types/block-sync.types';
import { computeCollaborationReconnectDelayMs } from '../../lib/pages.collaboration.lib';
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
  let socket: BlockLiveSocket | null = null;
  let isDestroyed = false;
  let attempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stopPing = (): void => {
    if (pingTimer === null) return;
    clearInterval(pingTimer);
    pingTimer = null;
  };

  const scheduleReconnect = (): void => {
    if (isDestroyed) return;
    attempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, computeCollaborationReconnectDelayMs(attempts));
  };

  const connect = async (): Promise<void> => {
    if (isDestroyed) return;
    const token = await requestToken().catch(() => null);
    if (isDestroyed) return;
    if (token === null) {
      scheduleReconnect();
      return;
    }
    const opened = openSocket(url);
    socket = opened;
    opened.listen({
      onClose: () => {
        if (socket !== opened || isDestroyed) return;
        socket = null;
        stopPing();
        scheduleReconnect();
      },
      onMessage: (text) => {
        const message = parseMessage(text);
        if (!message.success) return;
        if (message.data.type === 'notification') {
          onNotification();
          return;
        }
        attempts = 0;
        stopPing();
        pingTimer = setInterval(() => opened.send(JSON.stringify({ type: 'ping' })), INBOX_PING_INTERVAL_MS);
        onConnected();
      },
      onOpen: () => opened.send(JSON.stringify({ token, type: 'auth' })),
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
