import { InactiveUserError } from './auth.error';

export const assertUserIsActive = (user: { isActive: boolean }): InactiveUserError | null => {
  return user.isActive ? null : new InactiveUserError();
};

/** A token issued before versions existed carries none and counts as version 0. */
export const isRefreshTokenCurrent = (tokenVersion: number | undefined, accountVersion: number): boolean =>
  (tokenVersion ?? 0) === accountVersion;
