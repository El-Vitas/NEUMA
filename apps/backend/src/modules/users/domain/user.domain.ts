import { EmailAlreadyInUseError } from './user.error';

export const assertEmailAvailable = (
  existingUser: { id: string } | null,
  email: string,
): EmailAlreadyInUseError | null => {
  return existingUser === null ? null : new EmailAlreadyInUseError(email);
};
