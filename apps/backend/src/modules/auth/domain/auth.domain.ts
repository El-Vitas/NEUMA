import { InactiveUserError } from './auth.error';

export const assertUserIsActive = (user: { isActive: boolean }): InactiveUserError | null => {
  return user.isActive ? null : new InactiveUserError();
};
