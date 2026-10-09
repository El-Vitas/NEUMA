/**
 * El documento en vivo se negó a recibir lo escrito: entre que se revisó el
 * permiso y se escribió, la página se bloqueó, se fue a la papelera o dejó de
 * verse. Es una negativa, y se contesta como tal.
 */
export class PageLiveDocumentForbiddenError extends Error {
  constructor() {
    super('The live document refused the write');
    this.name = new.target.name;
  }
}
