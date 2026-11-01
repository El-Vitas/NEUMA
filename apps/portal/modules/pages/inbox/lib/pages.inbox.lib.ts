import type { NotificationView } from '@neuma/shared';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { DISCUSSION_QUERY_PARAMETER } from '../../discussions/constants/pages.discussions.constants';
import { INBOX_UNREAD_DISPLAY_MAX } from '../constants/pages.inbox.constants';

export const readNotificationSummaryKey = (kind: NotificationView['kind']): 'changed' | 'mentioned' | 'replied' => {
  switch (kind) {
    case 'MENTION':
      return 'mentioned';
    case 'REPLY':
      return 'replied';
    default:
      return 'changed';
  }
};

export const formatUnreadBadge = (count: number): string | null => {
  if (count <= 0) return null;
  return count > INBOX_UNREAD_DISPLAY_MAX ? `${String(INBOX_UNREAD_DISPLAY_MAX)}+` : String(count);
};

/** Opens the page at the block; a notification born in a conversation also names it, so the thread opens. */
export const buildNotificationHref = (notification: NotificationView): string => {
  const path = ROUTES.PORTAL_SPACE_PAGE(notification.spaceId, notification.pageId);
  const query = notification.discussionId === null ? '' : `?${DISCUSSION_QUERY_PARAMETER}=${notification.discussionId}`;
  return `${path}${query}#${notification.blockId}`;
};

export const markNotificationRead = (
  notifications: readonly NotificationView[],
  notificationId: string,
  readAt: string,
): readonly NotificationView[] =>
  notifications.map((notification) =>
    notification.id === notificationId ? { ...notification, readAt } : notification,
  );

export const markEveryNotificationRead = (
  notifications: readonly NotificationView[],
  readAt: string,
): readonly NotificationView[] =>
  notifications.map((notification) => (notification.readAt === null ? { ...notification, readAt } : notification));
