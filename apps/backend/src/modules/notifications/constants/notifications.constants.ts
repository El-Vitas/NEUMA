export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export const TEXT_MENTION_REPOSITORY = 'TEXT_MENTION_REPOSITORY';

/** The inbox reads this many times the page size per round, so a few hidden notifications cost no extra round. */
export const NOTIFICATION_SCAN_FACTOR = 3;

export const NOTIFICATION_BATCH_ROUNDS_MAX = 20;

/** The unread count looks at the newest unread notifications only; the bell shows "99+" beyond what it can count. */
export const NOTIFICATION_UNREAD_SCAN_MAX = 500;

/** How often the read notifications past their retention are deleted. */
export const NOTIFICATION_RETENTION_INTERVAL_MS = 6 * 60 * 60 * 1000;
