export const COLLABORATION_RECONNECT_BASE_DELAY_MS = 1000;
export const COLLABORATION_RECONNECT_MAX_DELAY_MS = 16_000;
export const MAX_COLLABORATION_RECONNECT_ATTEMPTS = 5;

/** The states in which the page falls back to writing alone, and says so. */
export const PAGE_COLLABORATION_DEGRADED_STATUSES: readonly string[] = ['error', 'disconnected', 'exhausted'];
