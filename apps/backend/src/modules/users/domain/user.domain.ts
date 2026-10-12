import { AdminAlreadyExistsError, EmailAlreadyInUseError } from './user.error';

export const assertEmailAvailable = (
  existingUser: { id: string } | null,
  email: string,
): EmailAlreadyInUseError | null => {
  return existingUser === null ? null : new EmailAlreadyInUseError(email);
};

/** The first admin can only be created while there is none; after that, admins create every account. */
export const assertNoAdminYet = (adminCount: number): AdminAlreadyExistsError | null =>
  adminCount === 0 ? null : new AdminAlreadyExistsError();
