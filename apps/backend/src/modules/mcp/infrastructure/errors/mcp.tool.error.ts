/**
 * Un fallo que el agente tiene que leer para saber qué hacer después.
 *
 * Se distingue de un fallo inesperado porque su mensaje está escrito para el
 * agente: dice qué pasó y cómo seguir. Lo inesperado no se le cuenta con
 * detalle, porque su detalle es del servidor y no le sirve para decidir nada.
 */
export class McpToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpToolError';
  }
}
