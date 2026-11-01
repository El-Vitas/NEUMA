/**
 * The `NOTIFY` channel of comments and notifications. It is separate from the channel of block versions because its
 * messages say who to tell, not which blocks changed.
 */
export const COMMENT_EVENTS_CHANNEL = 'comment_events';

export const COMMENT_EVENT_KIND = {
  discussion: 'discussion',
  notification: 'notification',
} as const;
