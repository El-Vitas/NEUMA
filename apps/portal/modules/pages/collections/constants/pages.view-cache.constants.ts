import type { PagesCachedRevalidation } from '../types/pages.cached-paint.types';

/** A copy as it was kept: nothing has been placed in it yet. */
export const NO_CACHED_REVALIDATION: PagesCachedRevalidation = {
  bands: null,
  isPurged: false,
  key: '',
  window: null,
};

/** The most rows one question to the server about what the reader may still open carries; the server's own limit. */
export const PAGE_REVOCATION_CHECK_BATCH_ROWS = 500;

/** The failures that say the reader may no longer read what the cache kept of a page. */
export const LOST_ACCESS_REASONS: readonly string[] = ['forbidden', 'missing'];

/** What makes the cache forget the rows of a collection at once: access lost, or rows it can no longer vouch for. */
export const CACHE_PURGING_CAUSES: readonly string[] = ['collection-resync', 'collection-revoked', 'revoked'];

/** Marks in the performance timeline of the browser: which source painted a view, and when. */
export const PAGE_VIEW_PAINT_MARK = {
  cache: 'neuma:view-painted:cache',
  server: 'neuma:view-painted:server',
} as const;
