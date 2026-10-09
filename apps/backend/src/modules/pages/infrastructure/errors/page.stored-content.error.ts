/**
 * Lo que la base guarda como contenido de una página ya no tiene la forma de un
 * documento. No es algo que quien pide pueda arreglar: es un dato roto, y se
 * cuenta con la página y el motivo para poder ir a buscarlo.
 */
export class PageStoredContentInvalidError extends Error {
  constructor(
    readonly pageId: string,
    cause: unknown,
  ) {
    super(`The stored content of page ${pageId} is not a valid document`, { cause });
    this.name = new.target.name;
  }
}
