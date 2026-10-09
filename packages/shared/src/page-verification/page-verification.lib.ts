import type { PageVerificationStatus } from './page-verification.definitions.js';

/**
 * An expired page still remembers who verified it and when, but no longer counts as valid.
 * Evaluated against `now` at read time, so no rewrite is needed as the calendar advances.
 */
export const resolvePageVerificationStatus = (
  verifiedAt: Date | null,
  verificationExpiresAt: Date | null,
  now: Date,
): PageVerificationStatus => {
  if (verifiedAt === null) return 'UNVERIFIED';
  if (verificationExpiresAt !== null && verificationExpiresAt <= now) return 'EXPIRED';
  return 'VERIFIED';
};
