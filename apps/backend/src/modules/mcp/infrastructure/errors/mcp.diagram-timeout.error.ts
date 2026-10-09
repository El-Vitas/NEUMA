/**
 * Un diagrama que el revisor no terminó de leer a tiempo. Es lo que escribió
 * el agente lo que tarda, no la infraestructura: se le dice que lo simplifique,
 * en vez de contestarle un fallo inesperado que lo haría reintentar lo mismo.
 */
export class McpDiagramCheckTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The diagram checker took more than ${String(timeoutMs)} ms on one diagram`);
    this.name = new.target.name;
  }
}
