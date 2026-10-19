import 'server-only';
import type { User } from '@neuma/shared';
import { ActionRefusalError } from '@/shared/lib/action-refusal.error';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

export class AccountOwnerUnknownError extends ActionRefusalError {
  readonly reason = 'forbidden';

  constructor() {
    super('No hay una sesión activa');
    this.name = 'AccountOwnerUnknownError';
  }
}

/** Read from the session, never from the input: an identifier in the input is only who the caller claims to be. */
export const requireOwnAccount = async (): Promise<Pick<User, 'email' | 'id'>> => {
  const user = await getCurrentUser();
  if (user === null) throw new AccountOwnerUnknownError();
  return { email: user.email, id: user.id };
};

export const requireOwnAccountId = async (): Promise<string> => (await requireOwnAccount()).id;
