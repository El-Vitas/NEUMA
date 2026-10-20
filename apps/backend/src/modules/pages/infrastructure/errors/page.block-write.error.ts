/** The blocks module refused a write in a way the pages module has no answer for; it carries the refusal as it came. */
export class PageBlockWriteError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: unknown,
  ) {
    super(`A page write was refused with ${code}: ${message}`);
    this.name = new.target.name;
  }
}
