import { ActionRefusalError } from './action-refusal.error';

export class MissingAccessTokenError extends ActionRefusalError {
  readonly reason = 'forbidden';

  constructor() {
    super('Authentication is required for this action');
    this.name = 'MissingAccessTokenError';
  }
}
