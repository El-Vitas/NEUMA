export const SEARCH_TRIGRAM_THRESHOLD = 0.18;
export const SEARCH_OUTBOX_MAX_ATTEMPTS = 5;
export const SEARCH_WORKER_IDLE_DELAY_MS = 1000;
export const SEARCH_EDITED_RANGE_VALUES = ['TODAY', 'LAST_SEVEN_DAYS', 'LAST_MONTH', 'THIS_YEAR'] as const;
export const SEARCH_MAX_AUTHOR_QUERY_LENGTH = 128;

/**
 * The largest version the index can be told about.
 *
 * A page that no longer exists has no version to compare against, and what is
 * asked for then is «forget whatever you have of it». That has to be said in a
 * number the store can actually hold: a larger one is not a bigger request, it
 * is a query that fails, and a failing removal leaves a thrown-away page
 * findable for good.
 */
export const SEARCH_MAX_VERSION_MARKER = 2_147_483_647;
