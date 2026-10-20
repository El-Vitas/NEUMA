/** The operation vocabulary of the blocks module, as a module that writes pages says it on the wire. */
export const BLOCK_WRITE_COMMAND = {
  listAfter: 'listAfter',
  listBefore: 'listBefore',
  listRemove: 'listRemove',
  mergePageValues: 'mergePageValues',
  moveToSpaceRoot: 'moveToSpaceRoot',
  rewritePageValues: 'rewritePageValues',
  set: 'set',
  setLifecycle: 'setLifecycle',
  setLock: 'setLock',
  setOwner: 'setOwner',
  setVerification: 'setVerification',
  update: 'update',
} as const;

export const BLOCK_WRITE_TABLE = 'block';

/** A pointer at a space addresses the list of its top-level pages. */
export const BLOCK_WRITE_SPACE_TABLE = 'space';

export const BLOCK_WRITE_ROOT_PAGES_PATH = 'rootPageIds';

/** The refusals of the blocks module that a caller tells apart; every other code is unexpected for it. */
export const BLOCK_WRITE_FAILURE_CODE = {
  accessDenied: 'BLOCK_ACCESS_DENIED',
  alreadyExists: 'BLOCK_ALREADY_EXISTS',
  contentInvalid: 'BLOCK_CONTENT_INVALID',
  cycle: 'BLOCK_CYCLE',
  editForbidden: 'BLOCK_EDIT_FORBIDDEN',
  invalidLifecycle: 'PAGE_INVALID_LIFECYCLE',
  locked: 'PAGE_LOCKED',
  transactionIdTaken: 'BLOCK_TRANSACTION_ID_TAKEN',
  treeInvalid: 'BLOCK_TREE_INVALID',
} as const;
