import type { PageVerificationStatus } from '../types/pages.verification.types';

/**
 * Whether a page is currently trustworthy, currently stale, or was never vouched for.
 *
 * Expiring is not the same as losing the verification: a page whose expiration
 * date has passed still remembers who verified it and when, but no longer
 * counts as valid. The comparison happens against `now` at render time, so a
 * page does not need to be written in again for its badge to catch up with the
 * calendar.
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

export const toVerificationExpiryInputValue = (date: Date | null): string =>
  date === null ? '' : date.toISOString().slice(0, 10);

/** The chosen day counts in full: the page stays valid through its last instant, not just its first. */
export const fromVerificationExpiryInputValue = (value: string): string | undefined =>
  value === '' ? undefined : new Date(`${value}T23:59:59.999Z`).toISOString();
