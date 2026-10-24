'use client';

import type { NotificationPageView, NotificationView } from '@neuma/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { env } from '@/config/env.config';
import { callAction, hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import { openBrowserBlockLiveSocket } from '../../block-sync/lib/block-sync.socket.lib';
import { requestBlockLiveToken } from '../../block-sync/lib/block-sync.token.lib';
import { createPagesInboxFeed } from '../lib/pages.inbox.feed.lib';
import { markEveryNotificationRead, markNotificationRead } from '../lib/pages.inbox.lib';
import {
  listNotificationsAction,
  markEveryNotificationReadAction,
  markNotificationReadAction,
} from '../server/actions/pages.inbox.actions';
import type { PagesInbox, PagesInboxStatus } from '../types/pages.inbox.types';

/**
 * The inbox of the person: the newest notifications and how many are unread. A live socket of its own tells when a
 * notification arrives, and the inbox is read again then, and each time the socket comes back.
 */
export const usePagesInbox = (): PagesInbox => {
  const [notifications, setNotifications] = useState<readonly NotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<PagesInboxStatus>('loading');
  const [isBusy, setIsBusy] = useState(false);
  const readCounterRef = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    readCounterRef.current += 1;
    const ticket = readCounterRef.current;
    const result = await callAction(() => listNotificationsAction({}));
    if (ticket !== readCounterRef.current) return;
    if (!isActionSuccess<NotificationPageView>(result)) {
      setStatus('failed');
      return;
    }
    setNotifications(result.data.notifications);
    setUnreadCount(result.data.unreadCount);
    setNextCursor(result.data.nextCursor);
    setStatus('ready');
  }, []);

  useEffect(() => {
    const feed = createPagesInboxFeed({
      onConnected: () => void refresh(),
      onNotification: () => void refresh(),
      openSocket: openBrowserBlockLiveSocket,
      requestToken: requestBlockLiveToken,
      url: env.NEXT_PUBLIC_LIVE_WS_URL,
    });
    const firstRead = setTimeout(() => void refresh(), 0);
    return () => {
      clearTimeout(firstRead);
      feed.destroy();
    };
  }, [refresh]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (nextCursor === null) return;
    setIsBusy(true);
    const result = await callAction(() => listNotificationsAction({ cursor: nextCursor }));
    if (isActionSuccess<NotificationPageView>(result)) {
      setNotifications((previous) => [...previous, ...result.data.notifications]);
      setNextCursor(result.data.nextCursor);
      setUnreadCount(result.data.unreadCount);
    }
    setIsBusy(false);
  }, [nextCursor]);

  const markRead = useCallback(
    async (notificationId: string): Promise<void> => {
      const result = await callAction(() => markNotificationReadAction({ notificationId }));
      if (hasActionError(result)) return;
      setNotifications((previous) => markNotificationRead(previous, notificationId, new Date().toISOString()));
      await refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async (): Promise<void> => {
    setIsBusy(true);
    await callAction(() => markEveryNotificationReadAction({}));
    setNotifications((previous) => markEveryNotificationRead(previous, new Date().toISOString()));
    setUnreadCount(0);
    setIsBusy(false);
  }, []);

  return {
    hasMore: nextCursor !== null,
    isBusy,
    loadMore,
    markAllRead,
    markRead,
    notifications,
    refresh,
    status,
    unreadCount,
  };
};
