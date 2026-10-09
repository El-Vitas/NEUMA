import type { PageVerificationStatus } from '@company-brain/shared';
import { BadgeCheck, CircleAlert, ShieldQuestion } from 'lucide-react';

export const PAGE_VERIFICATION_STATUS_ICON: Record<PageVerificationStatus, typeof BadgeCheck> = {
  EXPIRED: CircleAlert,
  UNVERIFIED: ShieldQuestion,
  VERIFIED: BadgeCheck,
};

export const PAGE_VERIFICATION_STATUS_TEXT_CLASS: Record<PageVerificationStatus, string> = {
  EXPIRED: 'text-warning',
  UNVERIFIED: 'text-muted-foreground',
  VERIFIED: 'text-success',
};

export const PAGE_VERIFICATION_STATUS_LABEL_KEY: Record<PageVerificationStatus, string> = {
  EXPIRED: 'statusExpired',
  UNVERIFIED: 'statusUnverified',
  VERIFIED: 'statusVerified',
};
