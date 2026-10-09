import { ActionRefusalError } from '@/shared/lib/action-refusal.error';

/** The account asking does not run the workspace, so the people in it are not its business. */
export class UsersAdministrationDeniedError extends ActionRefusalError {
  readonly reason = 'forbidden';

  constructor() {
    super('No administras este espacio de trabajo');
    this.name = 'UsersAdministrationDeniedError';
  }
}
