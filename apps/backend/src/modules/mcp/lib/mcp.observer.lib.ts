import type { McpLogger, McpObserver } from '../types/mcp.types';

/** An unexpected failure is logged with the error object itself so the stack trace is kept. */
export const createMcpObserver = (logger: McpLogger): McpObserver => ({
  callFinished: (call) => {
    logger.info({ mcpCall: call }, 'MCP tool call finished');
  },
  unexpected: (error, where) => {
    logger.error({ err: error, where }, 'MCP failed unexpectedly');
  },
});
