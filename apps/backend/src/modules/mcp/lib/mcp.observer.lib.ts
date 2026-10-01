import type { McpLogger, McpObserver } from '../types/mcp.types';

/**
 * Lo que pasa dentro del MCP, escrito en el log del proceso que lo corre.
 *
 * Cada llamada queda con su herramienta, cómo terminó y cuánto tardó, para ver
 * qué se usa y qué falla. Un fallo inesperado queda como error con el error
 * mismo, así el log conserva su traza.
 */
export const createMcpObserver = (logger: McpLogger): McpObserver => ({
  callFinished: (call) => {
    logger.info({ mcpCall: call }, 'MCP tool call finished');
  },
  unexpected: (error, where) => {
    logger.error({ err: error, where }, 'MCP failed unexpectedly');
  },
});
