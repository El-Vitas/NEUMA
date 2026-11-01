/** Change notices that arrive within this time of each other are answered with one read of the view. */
export const PAGE_COLLECTION_LIVE_COALESCE_MS = 150;

/** Reasons to draw the page again that also mean the rows held may be wrong: the notices in between were lost. */
export const STALE_REFRESH_REASONS: readonly string[] = ['computed-source', 'reconnected', 'revoked', 'write-rejected'];
