export const INBOX_API_ROUTES = {
  list: (query: string) => `/api/v1/notifications?${query}`,
  markAllRead: '/api/v1/notifications/read-all',
  markRead: (notificationId: string) => `/api/v1/notifications/${notificationId}/read`,
  unreadCount: '/api/v1/notifications/unread-count',
} as const;

export const INBOX_PAGE_SIZE = 20;

/** The bell shows this and a plus beyond it, as the server only counts the newest unread ones. */
export const INBOX_UNREAD_DISPLAY_MAX = 99;

/** The server closes a socket that is silent for 90 s. */
export const INBOX_PING_INTERVAL_MS = 30_000;

export const INBOX_CLOSE_CODE_RECONNECT_REQUIRED = 4410;
