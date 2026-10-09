/**
 * Otro pedido del mismo token con el mismo id se anotó primero: dos reintentos
 * que llegaron a la vez. El segundo no escribe nada.
 */
export class McpRequestTakenError extends Error {
  constructor(readonly requestId: string) {
    super(`Another call with request id ${requestId} is already under way`);
    this.name = new.target.name;
  }
}
