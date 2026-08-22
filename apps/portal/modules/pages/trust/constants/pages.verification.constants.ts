import { BadgeCheck, CircleAlert, ShieldQuestion } from 'lucide-react';

export const PAGE_VERIFICATION_STATUSES = ['UNVERIFIED', 'VERIFIED', 'EXPIRED'] as const;

export const PAGE_VERIFICATION_STATUS_ICON: Record<(typeof PAGE_VERIFICATION_STATUSES)[number], typeof BadgeCheck> = {
  EXPIRED: CircleAlert,
  UNVERIFIED: ShieldQuestion,
  VERIFIED: BadgeCheck,
};

export const PAGE_VERIFICATION_STATUS_TEXT_CLASS: Record<(typeof PAGE_VERIFICATION_STATUSES)[number], string> = {
  EXPIRED: 'text-warning',
  UNVERIFIED: 'text-muted-foreground',
  VERIFIED: 'text-success',
};

export const PAGE_VERIFICATION_STATUS_LABEL_KEY: Record<(typeof PAGE_VERIFICATION_STATUSES)[number], string> = {
  EXPIRED: 'statusExpired',
  UNVERIFIED: 'statusUnverified',
  VERIFIED: 'statusVerified',
};
