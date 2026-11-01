export const BLOCK_TRANSACTION_REPOSITORY = 'BLOCK_TRANSACTION_REPOSITORY';

export const BLOCK_OPERATION_TABLE = 'block';

/** A pointer at a space addresses the list of its top-level pages. */
export const BLOCK_SPACE_TABLE = 'space';

export const BLOCK_ROOT_PAGES_PATH = 'rootPageIds';

/** One request carries at most this many client transactions, each applied on its own. */
export const BLOCK_TRANSACTIONS_MAX_PER_REQUEST = 20;

export const BLOCK_OPERATIONS_MAX_PER_TRANSACTION = 100;

/** The backend's own writes (a column on every row, a copied branch) are larger than a client's, not unbounded. */
export const BLOCK_TRUSTED_OPERATIONS_MAX_PER_TRANSACTION = 25_000;

export const BLOCK_TRANSACTION_ID_MAX_LENGTH = 64;

/** `[bag, key]` is the deepest path an operation addresses, such as `['format', 'textColor']`. */
export const BLOCK_OPERATION_PATH_MAX_LENGTH = 2;

export const BLOCK_PROPERTY_KEY_MAX_LENGTH = 64;

export const BLOCK_PROPERTY_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export const BLOCK_TYPE_MAX_LENGTH = 64;

/** Base64 characters of one Yjs update: about 190 KiB once decoded. */
export const BLOCK_TEXT_UPDATE_MAX_BASE64_LENGTH = 262_144;

/** The merged state of one block never grows past this; it is stored whole in `textState`. */
export const BLOCK_TEXT_STATE_MAX_BYTES = 1_048_576;

/** Every column of a block record. The binary `textState` is left out: only the rows being written need it. */
export const BLOCK_RECORD_COLUMNS = [
  'alive',
  'children',
  'createdAt',
  'createdById',
  'editedAt',
  'editedById',
  'format',
  'id',
  'lifecycle',
  'lockedAt',
  'parentId',
  'permissions',
  'properties',
  'spaceId',
  'text',
  'type',
  'version',
] as const;

/** A client transaction is run at most this many times when Postgres rolls it back for a deadlock. */
export const BLOCK_TRANSACTION_MAX_ATTEMPTS = 3;

/** The pause before attempt n + 1 is this times n. */
export const BLOCK_TRANSACTION_RETRY_BACKOFF_MS = 25;

export const BLOCK_COMMAND = {
  addRelation: 'addRelation',
  applyText: 'applyText',
  listAfter: 'listAfter',
  listBefore: 'listBefore',
  listRemove: 'listRemove',
  removeRelation: 'removeRelation',
  set: 'set',
  setPermission: 'setPermission',
  update: 'update',
} as const;

export const BLOCK_COMMAND_VALUES = [
  BLOCK_COMMAND.set,
  BLOCK_COMMAND.update,
  BLOCK_COMMAND.listAfter,
  BLOCK_COMMAND.listBefore,
  BLOCK_COMMAND.listRemove,
  BLOCK_COMMAND.applyText,
  BLOCK_COMMAND.setPermission,
  BLOCK_COMMAND.addRelation,
  BLOCK_COMMAND.removeRelation,
] as const;

/**
 * Commands that only the backend itself sends, on behalf of the pages module. A client never reaches them through
 * `POST /transactions`, because each carries a rule that lives outside the pipeline (who may own a page, which
 * space a branch moves to).
 */
export const BLOCK_PAGE_COMMAND = {
  changeValueList: 'changeValueList',
  mergePageValues: 'mergePageValues',
  moveToSpaceRoot: 'moveToSpaceRoot',
  rewritePageValues: 'rewritePageValues',
  setLifecycle: 'setLifecycle',
  setLock: 'setLock',
  setOwner: 'setOwner',
  setVerification: 'setVerification',
} as const;

export const BLOCK_PAGE_COMMAND_VALUES = [
  BLOCK_PAGE_COMMAND.setLifecycle,
  BLOCK_PAGE_COMMAND.setLock,
  BLOCK_PAGE_COMMAND.setVerification,
  BLOCK_PAGE_COMMAND.setOwner,
  BLOCK_PAGE_COMMAND.mergePageValues,
  BLOCK_PAGE_COMMAND.changeValueList,
  BLOCK_PAGE_COMMAND.rewritePageValues,
  BLOCK_PAGE_COMMAND.moveToSpaceRoot,
] as const;

export const BLOCK_TRUSTED_COMMAND_VALUES = [...BLOCK_COMMAND_VALUES, ...BLOCK_PAGE_COMMAND_VALUES] as const;

export const BLOCK_CHILDREN_PATH = 'children';

export const BLOCK_NOTIFY_CHANNEL = 'block_versions';

/** Moves lock the tree of a space, so two concurrent moves cannot each hang a block under the other. */
export const BLOCK_TREE_LOCK_PREFIX = 'block-tree:';
