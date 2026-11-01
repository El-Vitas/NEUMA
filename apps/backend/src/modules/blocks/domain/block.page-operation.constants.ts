/** What a page block holds in its page columns when nothing was ever written to them. */
export const BLOCK_NO_PAGE_COLUMNS = {
  lockedById: null,
  ownerId: null,
  purgeAfter: null,
  trashedAt: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedById: null,
} as const;
