import { listSpacesTool } from '../tools/mcp.list-spaces.tool';
import { readPageTool } from '../tools/mcp.read-page.tool';
import { searchTool } from '../tools/mcp.search.tool';
import type { McpToolDefinition } from '../types/mcp.types';

/** Todas las herramientas, en el orden en que se le presentan al agente. Agregar una es sumarla aquí. */
export const MCP_TOOLS: readonly McpToolDefinition[] = [listSpacesTool, readPageTool, searchTool];
