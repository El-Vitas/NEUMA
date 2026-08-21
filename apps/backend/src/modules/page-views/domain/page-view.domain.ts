export const shouldRecordPageView = (lastViewedAt: Date | null, now: Date, cooldownMs: number): boolean =>
  lastViewedAt === null || now.getTime() - lastViewedAt.getTime() >= cooldownMs;
