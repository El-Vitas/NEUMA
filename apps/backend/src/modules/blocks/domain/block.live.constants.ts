/** A message that would list more rows than this asks the reader to query again instead. */
export const BLOCK_LIVE_COLLECTION_MESSAGE_MAX_ROWS = 500;

/** A message that would name more parents than this asks the sidebar to read its open branches again instead. */
export const BLOCK_LIVE_TREE_MESSAGE_MAX_PARENTS = 50;

export const BLOCK_LIVE_ERROR_CODE = {
  accessDenied: 'access-denied',
  alreadyAuthenticated: 'already-authenticated',
  internal: 'internal-error',
  invalidMessage: 'invalid-message',
  notSubscribed: 'not-subscribed',
  rateLimited: 'rate-limited',
  tooManySubscriptions: 'too-many-subscriptions',
} as const;
