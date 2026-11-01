import { InactiveUserError } from './auth.error';

export const assertUserIsActive = (user: { isActive: boolean }): InactiveUserError | null => {
  return user.isActive ? null : new InactiveUserError();
};

export const isRefreshTokenCurrent = (tokenVersion: number, accountVersion: number): boolean =>
  tokenVersion === accountVersion;

export const isReplayGraceOpen = (usedAt: Date, now: Date, graceMilliseconds: number): boolean =>
  now.getTime() - usedAt.getTime() < graceMilliseconds;

/** A successor that was already spent means the client moved on, so the old token coming back is not a double-send. */
export const isReplaySuccessorUsable = <Successor extends { expiresAt: Date; usedAt: Date | null }>(
  successor: Successor | null,
  now: Date,
): successor is Successor =>
  successor !== null && successor.usedAt === null && successor.expiresAt.getTime() > now.getTime();
