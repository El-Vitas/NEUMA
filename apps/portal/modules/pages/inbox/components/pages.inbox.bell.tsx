'use client';

import type { NotificationView } from '@neuma/shared';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { usePagesInbox } from '../hooks/use.pages.inbox';
import { buildNotificationHref, formatUnreadBadge } from '../lib/pages.inbox.lib';
import { PagesInboxItem } from './pages.inbox.item';

/**
 * The bell of the inbox: unread count on top, the list of notifications in a popover, each one leading to the block
 * it is about. It keeps its own live connection, so it is mounted once in the header and nowhere else.
 */
export const PagesInboxBell = () => {
  const t = useTranslations('pages.inbox');
  const router = useRouter();
  const inbox = usePagesInbox();
  const [isOpen, setIsOpen] = useState(false);
  const badge = formatUnreadBadge(inbox.unreadCount);

  const open = (notification: NotificationView): void => {
    setIsOpen(false);
    if (notification.readAt === null) void inbox.markRead(notification.id);
    router.push(buildNotificationHref(notification));
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={inbox.unreadCount > 0 ? t('unread', { count: inbox.unreadCount }) : t('open')}
          className="relative min-h-11 min-w-11"
          data-unread-count={inbox.unreadCount}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Bell aria-hidden="true" />
          {badge !== null && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center bg-primary px-1 font-medium text-[10px]/4 text-primary-foreground tabular-nums">
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-border border-b px-3 py-2">
          <h2 className="font-medium text-sm">{t('title')}</h2>
          <Button
            className="min-h-11"
            disabled={inbox.isBusy || inbox.unreadCount === 0}
            onClick={() => void inbox.markAllRead()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t('markAll')}
          </Button>
        </div>
        {inbox.status === 'failed' && <p className="px-3 py-4 text-destructive text-sm">{t('loadFailed')}</p>}
        {inbox.status === 'ready' && inbox.notifications.length === 0 && (
          <p className="px-3 py-4 text-muted-foreground text-sm">{t('empty')}</p>
        )}
        <ul className="max-h-96 overflow-y-auto">
          {inbox.notifications.map((notification) => (
            <PagesInboxItem key={notification.id} notification={notification} onOpen={open} />
          ))}
        </ul>
        {inbox.hasMore && (
          <Button
            className="min-h-11 w-full"
            disabled={inbox.isBusy}
            onClick={() => void inbox.loadMore()}
            type="button"
            variant="ghost"
          >
            {t('loadMore')}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
