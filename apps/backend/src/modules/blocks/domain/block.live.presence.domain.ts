import type { PresenceEntry, PresenceReport } from './block.live.domain.types';

export const createPresenceEntry = (report: PresenceReport, now: number, timeToLiveMs: number): PresenceEntry => ({
  ...report,
  expiresAt: now + timeToLiveMs,
});

/** An entry lives until its expiry instant; at that instant it is already gone. */
export const isPresenceActive = (entry: PresenceEntry, now: number): boolean => entry.expiresAt > now;
