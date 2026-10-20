export const BLOCK_MIGRATION_MODE = {
  apply: 'apply',
  check: 'check',
  verify: 'verify',
} as const;

export const BLOCK_MIGRATION_USAGE = 'Usage: bun run blocks:migrate -- --check | --apply | --verify';

export const BLOCK_MIGRATION_LOG_LEVEL = 'info';

/** Pages converted and written in one transaction. */
export const BLOCK_MIGRATION_PAGE_BATCH_SIZE = 50;

/** Page rows without content read per statement when the hierarchy is loaded. */
export const BLOCK_MIGRATION_HIERARCHY_READ_SIZE = 5000;

/** Ids sent in one `IN` list, far below the parameter limit of a statement. */
export const BLOCK_MIGRATION_ID_LOOKUP_SIZE = 1000;

/** Rows sent in one insert statement. */
export const BLOCK_MIGRATION_INSERT_SIZE = 500;

export const BLOCK_MIGRATION_INITIAL_VERSION = 1;

export const BLOCK_MIGRATION_EXIT_CODE_FAILURE = 1;

/** Keeps the id of a block that changes place away from the ids the editor and the document path derive. */
export const BLOCK_MIGRATION_REMAP_NAMESPACE = 'block-id-remap';

export const BLOCK_MIGRATION_REMAP_SEPARATOR = ':';

export const BLOCK_MIGRATION_PROBLEM = {
  conversionFailed: 'conversion_failed',
  crossSpaceParent: 'cross_space_parent',
  idTakenByExistingBlock: 'id_taken_by_existing_block',
  pageTooLarge: 'page_too_large',
  roundTripMismatch: 'round_trip_mismatch',
  storedMismatch: 'stored_mismatch',
  tagLikeToggleSummary: 'tag_like_toggle_summary',
  unreachablePage: 'unreachable_page',
  unresolvedDuplicateId: 'unresolved_duplicate_id',
} as const;

export const BLOCK_MIGRATION_PATH_SEPARATOR = '.';

export const BLOCK_MIGRATION_TOGGLE_NODE = 'toggle';

export const BLOCK_MIGRATION_SYNCED_NODE = 'synced';

/** A content block carries none of the columns that only a page uses. */
export const BLOCK_MIGRATION_NO_PAGE_COLUMNS = {
  lockedById: null,
  ownerId: null,
  purgeAfter: null,
  trashedAt: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedById: null,
} as const;

/** The columns verification compares one by one; the Yjs state is checked apart, since every build gives new bytes. */
export const BLOCK_MIGRATION_COMPARED_FIELDS = [
  'alive',
  'children',
  'createdAt',
  'createdById',
  'editedAt',
  'editedById',
  'format',
  'lifecycle',
  'lockedAt',
  'lockedById',
  'ownerId',
  'parentId',
  'permissions',
  'properties',
  'purgeAfter',
  'spaceId',
  'text',
  'trashedAt',
  'type',
  'verificationExpiresAt',
  'verifiedAt',
  'verifiedById',
  'version',
] as const;

export const BLOCK_MIGRATION_LIFECYCLE = {
  active: 'ACTIVE',
  trashed: 'TRASHED',
} as const;
