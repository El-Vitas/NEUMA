export const CLIENT_MODE_MAXIMUM_ROWS = 10_000;

export const CLIENT_MODE_MAXIMUM_BYTES = 6_000_000;

/** What a row weighs on the wire, as ADR 029 measured it; the size of a collection is told from its row count. */
export const PAGE_CLIENT_MODE_ROW_BYTES = 400;

/** Properties whose value depends on rows or rules the browser does not hold. */
export const CLIENT_MODE_SERVER_ONLY_PROPERTY_TYPES: readonly string[] = ['FORMULA', 'RELATION', 'ROLLUP'];

export const LOCAL_CACHE_MAXIMUM_BYTES = 50 * 1_048_576;

export const LOCAL_CACHE_QUOTA_SHARE = 0.1;

export const LOCAL_CACHE_EVICTION_TARGET_SHARE = 0.8;

/** Bumped when the shape of what is stored changes; the cache is dropped, the pending writes are kept. */
export const LOCAL_CACHE_VERSION = 1;

/** A result not checked against the server for this long is not shown: access may have been taken away since. */
export const LOCAL_CACHE_VALIDATION_MAXIMUM_AGE_MS = 30 * 86_400_000;

export const LOCAL_CACHE_DATABASE_PREFIX = 'neuma-cache:';

export const LOCAL_CACHE_RECORD_EVICTION_PREFIX = 'record:';

/** Sent on `window` whenever a change is set aside, so the panel of changes that were not applied reads them again. */
export const LOCAL_CACHE_OUTBOX_CHANGED_EVENT = 'neuma:outbox-changed';

/** Sent on `window` when a refused change goes back to the pending ones, so the queue of its collection sends it. */
export const LOCAL_CACHE_OUTBOX_RETRY_EVENT = 'neuma:outbox-retry';

export const LOCAL_CACHE_DATABASE_SCHEMA_VERSION = 1;

export const LOCAL_CACHE_META_KEY = 'meta';

export const LOCAL_CACHE_STORE = {
  meta: 'meta',
  records: 'records',
  rejected: 'rejected',
  results: 'results',
  transactions: 'transactions',
} as const;

/** The stores that only hold what the server can send again. */
export const LOCAL_CACHE_DISPOSABLE_STORES: readonly string[] = [LOCAL_CACHE_STORE.records, LOCAL_CACHE_STORE.results];
