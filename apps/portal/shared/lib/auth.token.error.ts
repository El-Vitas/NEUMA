import { ActionRefusalError } from './action-refusal.error';

/** Nobody is signed in: there is no session to act in the name of. */
export class MissingAccessTokenError extends ActionRefusalError {
  readonly reason = 'forbidden';

  constructor() {
    super('Authentication is required for this action');
    this.name = 'MissingAccessTokenError';
  }
}
