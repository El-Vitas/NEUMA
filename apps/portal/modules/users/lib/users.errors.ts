import { ActionRefusalError } from '@/shared/lib/action-refusal.error';

export class UsersAdministrationDeniedError extends ActionRefusalError {
  readonly reason = 'forbidden';

  constructor() {
    super('No administras este espacio de trabajo');
    this.name = 'UsersAdministrationDeniedError';
  }
}
