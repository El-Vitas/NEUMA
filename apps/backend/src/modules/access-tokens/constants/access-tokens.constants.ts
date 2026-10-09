export const ACCESS_TOKEN_REPOSITORY = Symbol('ACCESS_TOKEN_REPOSITORY');

/** A distinctive prefix lets a leaked token be recognized and found by secret scanners. */
export const ACCESS_TOKEN_SECRET_PREFIX = 'cbk_';

/** 256 bits, as strong as a signing key. */
export const ACCESS_TOKEN_RANDOM_BYTES = 32;

/** Length of the random part as unpadded base64url. */
export const ACCESS_TOKEN_ENCODED_RANDOM_LENGTH = Math.ceil((ACCESS_TOKEN_RANDOM_BYTES * 4) / 3);

export const ACCESS_TOKEN_ENCODED_RANDOM_PATTERN = new RegExp(
  `^[A-Za-z0-9_-]{${String(ACCESS_TOKEN_ENCODED_RANDOM_LENGTH)}}$`,
);

/** Leading characters shown in lists: enough to recognize a token, not to use it. */
export const ACCESS_TOKEN_DISPLAY_LENGTH = 12;

/** Caps live tokens per user so a leak cannot multiply without bound. */
export const ACCESS_TOKEN_LIMIT_PER_USER = 20;

/** Minute precision is enough for the list, and an agent makes dozens of calls per minute. */
export const ACCESS_TOKEN_LAST_USED_RESOLUTION_MS = 60_000;

export const ACCESS_TOKENS_ROUTE = 'access-tokens';

export const ACCESS_TOKENS_WORKSPACE_SEGMENT = 'workspace';
