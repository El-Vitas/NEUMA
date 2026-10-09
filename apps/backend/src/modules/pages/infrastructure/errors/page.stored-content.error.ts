/** Corrupt stored data the caller cannot fix; carries the page id and cause for diagnosis. */
export class PageStoredContentInvalidError extends Error {
  constructor(
    readonly pageId: string,
    cause: unknown,
  ) {
    super(`The stored content of page ${pageId} is not a valid document`, { cause });
    this.name = new.target.name;
  }
}
