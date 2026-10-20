export const NOTIFICATION_KIND = {
  mention: 'MENTION',
  pageChange: 'PAGE_CHANGE',
  reply: 'REPLY',
} as const;

export const NOTIFICATION_KIND_VALUES = [
  NOTIFICATION_KIND.mention,
  NOTIFICATION_KIND.reply,
  NOTIFICATION_KIND.pageChange,
] as const;

/** A comment is plain-sized chat, not a document: the same bound the old comments had. */
export const COMMENT_TEXT_MAX_LENGTH = 2000;

/** The most people one comment can name, so one message cannot notify a whole workspace. */
export const COMMENT_MENTIONS_MAX = 20;

export const DISCUSSION_QUOTE_MAX_LENGTH = 500;

export const DISCUSSIONS_PAGE_SIZE_DEFAULT = 50;

export const DISCUSSIONS_PAGE_SIZE_MAX = 100;

export const NOTIFICATIONS_PAGE_SIZE_DEFAULT = 30;

export const NOTIFICATIONS_PAGE_SIZE_MAX = 100;

export const NOTIFICATION_EXCERPT_MAX_LENGTH = 140;

/** A read notification is deleted this many days after it was read; an unread one never is. */
export const NOTIFICATION_READ_RETENTION_DAYS = 90;
