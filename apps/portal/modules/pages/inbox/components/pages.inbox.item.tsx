'use client';

import type { NotificationView } from '@neuma/shared';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { readNotificationSummaryKey } from '../lib/pages.inbox.lib';

interface IProps {
  readonly notification: NotificationView;
  readonly onOpen: (notification: NotificationView) => void;
}

/** One line of the inbox: who did what, where, and the words; unread ones stand out. */
export const PagesInboxItem = ({ notification, onOpen }: IProps) => {
  const t = useTranslations('pages.inbox');
  const format = useFormatter();
  const now = useNow();
  const unread = notification.readAt === null;
  const createdAt = new Date(notification.createdAt);

  return (
    <li>
      <button
        className={cn(
          'flex min-h-11 w-full flex-col gap-0.5 border-border border-b px-3 py-2 text-left text-sm hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none',
          unread && 'bg-primary/5',
        )}
        data-unread={unread}
        onClick={() => onOpen(notification)}
        type="button"
      >
        <span className={cn('text-foreground', unread && 'font-medium')}>
          {t(readNotificationSummaryKey(notification.kind), { name: notification.actorName })}
        </span>
        {notification.excerpt !== '' && (
          <span className="wrap-break-word line-clamp-2 font-reading text-muted-foreground">
            {notification.excerpt}
          </span>
        )}
        <span className="flex justify-between gap-2 text-muted-foreground text-xs">
          <span className="truncate">
            {t('inPage', { page: notification.pageTitle === '' ? t('untitledPage') : notification.pageTitle })}
          </span>
          {!Number.isNaN(createdAt.getTime()) && (
            <span className="shrink-0">{format.relativeTime(createdAt, now)}</span>
          )}
        </span>
      </button>
    </li>
  );
};
