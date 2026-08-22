/** The account asking does not run the workspace, so the people in it are not its business. */
export class UsersAdministrationDeniedError extends Error {
  constructor() {
    super('No administras este espacio de trabajo');
    this.name = 'UsersAdministrationDeniedError';
  }
}
