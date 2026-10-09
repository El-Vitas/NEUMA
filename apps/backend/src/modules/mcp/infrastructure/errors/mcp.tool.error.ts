import type { McpRefusalReason } from '../../types/mcp.types';

/**
 * Un fallo que el agente tiene que leer para saber qué hacer después.
 *
 * Se distingue de un fallo inesperado porque su mensaje está escrito para el
 * agente: dice qué pasó y cómo seguir. Lo inesperado no se le cuenta con
 * detalle, porque su detalle es del servidor y no le sirve para decidir nada.
 * El motivo, cuando lo hay, es lo que queda en el log en lugar del mensaje.
 */
export class McpToolError extends Error {
  readonly reason?: McpRefusalReason;

  constructor(message: string, reason?: McpRefusalReason) {
    super(message);
    this.name = 'McpToolError';
    if (reason !== undefined) this.reason = reason;
  }
}
