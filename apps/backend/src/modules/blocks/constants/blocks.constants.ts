export const BLOCK_REPOSITORY = 'BLOCK_REPOSITORY';

export const BLOCK_ID_MAX_LENGTH = 64;

/** Postgres `int4` ceiling, the largest version a column can hold. */
export const BLOCK_VERSION_MAX = 2_147_483_647;

/** Reconnect catch-up: how many blocks a client may report in one request. */
export const BLOCK_SYNC_MAX_REQUESTED_BLOCKS = 500;

/** A page larger than this is refused instead of silently truncated. */
export const BLOCK_SUBTREE_MAX_BLOCKS = 5000;

/** The Yjs states a single read hands out, summed over the blocks the viewer can read. */
export const BLOCK_SYNC_MAX_TEXT_STATE_BYTES = 16_777_216;

/** Stops a corrupt parent cycle from recursing forever, in the subtree and in the ancestor chain. */
export const BLOCK_TREE_MAX_DEPTH = 64;

/** A child page is returned as a row but not opened: its own blocks load when that page is opened. */
export const BLOCK_PAGE_TYPE = 'page';

export const BLOCK_SYNC_CHOICE_MESSAGE = 'Send either pageId or blocks, not both';

export const BLOCK_RELATION = {
  context: 'context',
  target: 'target',
} as const;
