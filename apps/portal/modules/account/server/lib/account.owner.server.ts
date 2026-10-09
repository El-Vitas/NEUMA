import 'server-only';
import { ActionRefusalError } from '@/shared/lib/action-refusal.error';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

/** Nobody is signed in, so there is no account to edit. */
export class AccountOwnerUnknownError extends ActionRefusalError {
  readonly reason = 'forbidden';

  constructor() {
    super('No hay una sesión activa');
    this.name = 'AccountOwnerUnknownError';
  }
}

/**
 * Whose account is being edited.
 *
 * Read from the session and never from what was sent: an action answers to its
 * own address, so an identifier arriving in its input says who the caller
 * claims to be, which is not the same as who they are.
 */
export const requireOwnAccountId = async (): Promise<string> => {
  const user = await getCurrentUser();
  if (user === null) throw new AccountOwnerUnknownError();
  return user.id;
};
