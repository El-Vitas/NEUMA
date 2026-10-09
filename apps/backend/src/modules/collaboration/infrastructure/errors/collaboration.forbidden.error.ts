/**
 * El documento en vivo no deja abrir o escribir una página: no es suya, no
 * existe, está en la papelera o está bloqueada. Tiene su propio tipo para que
 * quien escribe por él pueda distinguir una negativa de una falla.
 */
export class CollaborationForbiddenError extends Error {
  constructor() {
    super('forbidden');
    this.name = new.target.name;
  }
}
