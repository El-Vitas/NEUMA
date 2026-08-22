import type { PageAuthor } from '../../types/pages.types';
import type { PAGE_VERIFICATION_STATUSES } from '../constants/pages.verification.constants';

export type PageVerificationStatus = (typeof PAGE_VERIFICATION_STATUSES)[number];

export interface PageVerificationChange {
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedBy: null | PageAuthor;
}
