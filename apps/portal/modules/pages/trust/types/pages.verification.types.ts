import type { PageAuthor } from '../../types/pages.types';

export interface PageVerificationChange {
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedBy: null | PageAuthor;
}
