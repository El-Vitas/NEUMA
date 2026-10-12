export const PAGE_VERIFICATION_STATUSES = ['UNVERIFIED', 'VERIFIED', 'EXPIRED'] as const;

export type PageVerificationStatus = (typeof PAGE_VERIFICATION_STATUSES)[number];
