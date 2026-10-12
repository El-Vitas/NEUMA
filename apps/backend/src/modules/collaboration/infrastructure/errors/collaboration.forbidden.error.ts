/** Distinct type so callers can tell a denial (not allowed, missing, trashed, locked) from a failure. */
export class CollaborationForbiddenError extends Error {
  constructor() {
    super('forbidden');
    this.name = new.target.name;
  }
}
