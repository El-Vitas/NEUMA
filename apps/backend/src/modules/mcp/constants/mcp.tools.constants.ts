import { fetchTool } from '../tools/mcp.fetch.tool';
import { listPagesTool } from '../tools/mcp.list-pages.tool';
import { listSpacesTool } from '../tools/mcp.list-spaces.tool';
import { searchTool } from '../tools/mcp.search.tool';
import type { McpToolDefinition } from '../types/mcp.types';

/** Todas las herramientas, en el orden en que se le presentan al agente. Agregar una es sumarla aquí. */
export const MCP_TOOLS: readonly McpToolDefinition[] = [searchTool, fetchTool, listSpacesTool, listPagesTool];
