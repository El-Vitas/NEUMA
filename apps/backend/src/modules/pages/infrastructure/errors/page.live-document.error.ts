/** The page was locked, trashed or hidden between the permission check and the write. */
export class PageLiveDocumentForbiddenError extends Error {
  constructor() {
    super('The live document refused the write');
    this.name = new.target.name;
  }
}
