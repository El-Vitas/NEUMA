import { canManageWorkspace, MILLISECONDS_IN_A_DAY, type UserRole } from '@neuma/shared';

/** Deleting forever is an administrator's call: anyone else can trash and restore, never erase. */
export const canDeletePagesForever = (role: UserRole): boolean => canManageWorkspace(role);

export const computePurgeAfter = (requestedAt: Date, delayDays: number): Date =>
  new Date(requestedAt.getTime() + delayDays * MILLISECONDS_IN_A_DAY);

export const computeDaysBefore = (now: Date, days: number): Date =>
  new Date(now.getTime() - days * MILLISECONDS_IN_A_DAY);
