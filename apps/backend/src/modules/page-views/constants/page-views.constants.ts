export const PAGE_VIEW_REPOSITORY = 'PAGE_VIEW_REPOSITORY';

/**
 * A page opened again soon after is still the same visit, not a new one:
 * re-renders, tab switches and quick back-and-forth navigation should not
 * inflate the count. A return later in the day is a genuine second visit.
 */
export const PAGE_VIEW_COOLDOWN_MS = 30 * 60 * 1000;

export const PAGE_VIEW_LIST_LIMIT = 50;
