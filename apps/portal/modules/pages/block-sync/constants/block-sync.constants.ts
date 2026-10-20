import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';

export const BLOCK_SYNC_API_ROUTES = {
  liveToken: '/api/v1/blocks/live/token',
  sync: '/api/v1/sync',
} as const;

export const BLOCK_SYNC_CACHE_TAG = (pageId: string): string => `block-sync-${pageId}`;

export const BLOCK_SYNC_LIVE_PATH = '/blocks/live';

/** The collaboration socket and the block socket are served by the same backend, under the same prefix. */
export const BLOCK_SYNC_COLLABORATION_PATH_SUFFIX = /\/collaboration\/?$/;

/** Local edits within this window leave as one transaction, so typing does not send a request per key. */
export const BLOCK_SYNC_COALESCE_INTERVAL_MS = 100;

export const BLOCK_SYNC_REQUEST_TIMEOUT_MS = 15_000;

/** The server closes a socket that is silent for 90 s. */
export const BLOCK_SYNC_PING_INTERVAL_MS = 30_000;

export const BLOCK_SYNC_PRESENCE_THROTTLE_MS = 500;

export const BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS = 2000;

export const BLOCK_SYNC_RATE_LIMIT_MAX_DELAY_MS = 16_000;

/** One transaction carries at most this many operations on the server. */
export const BLOCK_SYNC_OPERATIONS_PER_TRANSACTION_MAX = 100;

export const BLOCK_SYNC_TABLE = 'block';

export const BLOCK_SYNC_CHILDREN_PATH = 'children';

export const BLOCK_SYNC_COMMAND = {
  applyText: 'applyText',
  listAfter: 'listAfter',
  listBefore: 'listBefore',
  listRemove: 'listRemove',
  set: 'set',
  update: 'update',
} as const;

export const BLOCK_SYNC_BAG = {
  format: 'format',
  properties: 'properties',
} as const;

export const BLOCK_SYNC_CLOSE_CODE = {
  idle: 4408,
  messageTooBig: 1009,
  policyViolation: 1008,
  reconnectRequired: 4410,
  tooManyConnections: 4429,
  unauthorized: 4401,
} as const;

export const BLOCK_SYNC_ERROR_CODE = {
  rateLimited: 'rate-limited',
  textOutOfSync: 'BLOCK_TEXT_OUT_OF_SYNC',
} as const;

/** A transaction the server keeps refusing after this many rebases is given up on, not retried forever. */
export const BLOCK_SYNC_REBASE_ATTEMPTS_MAX = 3;

/** Refusals that no sync can fix: the writer may not edit the page now. */
export const BLOCK_SYNC_FORBIDDEN_ERROR_CODES: readonly string[] = [
  'BLOCK_EDIT_FORBIDDEN',
  'PAGE_LOCKED',
  'PAGE_INVALID_LIFECYCLE',
  'BLOCK_ACCESS_DENIED',
];

/** Sent to the server when the cursor is in no block. */
export const BLOCK_SYNC_NO_BLOCK_ID = null;

/** A property whose value is a list of text segments holds rich text. */
export const BLOCK_SYNC_SEGMENT_INSERT_KEY = 'insert';

export const BLOCK_SYNC_PRESENCE_COLORS: readonly string[] = [
  '#e11d48',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#c026d3',
];

export const BLOCK_SYNC_HIGH_SURROGATE_RANGE = { first: 0xd8_00, last: 0xdb_ff } as const;

export const BLOCK_SYNC_LOW_SURROGATE_RANGE = { first: 0xdc_00, last: 0xdf_ff } as const;

export const BLOCK_SYNC_BASE64_CHUNK_SIZE = 0x80_00;

export const BLOCK_SYNC_REMOTE_META = 'blockSyncRemote';

/** Asks the server for the full state of a block whatever version is held. */
export const BLOCK_SYNC_FORCE_VERSION = 0;

/** The page can no longer be read by this connection. */
export const BLOCK_SYNC_ACCESS_DENIED_CODE = 'access-denied';

export const BLOCK_SYNC_FAILED_START = { blocks: null, content: null, isFailed: true } as const;

export const BLOCK_SYNC_KEY_SEPARATOR = '\u0000';

export const BLOCK_SYNC_HASH_MULTIPLIER = 31;

export const BLOCK_SYNC_SAVE_STATE_BY_QUEUE_STATE: Readonly<
  Record<'backOnline' | 'idle' | 'offline' | 'saving', PagesAutosaveDisplayState>
> = {
  backOnline: 'backOnline',
  idle: 'saved',
  offline: 'offline',
  saving: 'saving',
};
