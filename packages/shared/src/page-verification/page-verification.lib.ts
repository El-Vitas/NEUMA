import type { PageVerificationStatus } from './page-verification.definitions.js';

/**
 * Whether a page is currently trustworthy, currently stale, or was never vouched for.
 *
 * Expiring is not the same as losing the verification: a page whose expiration
 * date has passed still remembers who verified it and when, but no longer
 * counts as valid. The comparison happens against `now` when it is read, so a
 * page does not need to be written in again to catch up with the calendar.
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
