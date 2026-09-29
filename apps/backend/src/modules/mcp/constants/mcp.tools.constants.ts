import { createRowTool } from '../tools/mcp.create-row.tool';
import { createViewTool } from '../tools/mcp.create-view.tool';
import { deleteViewTool } from '../tools/mcp.delete-view.tool';
import { fetchTool } from '../tools/mcp.fetch.tool';
import { getCollectionTool } from '../tools/mcp.get-collection.tool';
import { listPagesTool } from '../tools/mcp.list-pages.tool';
import { listSpacesTool } from '../tools/mcp.list-spaces.tool';
import { queryCollectionTool } from '../tools/mcp.query-collection.tool';
import { searchTool } from '../tools/mcp.search.tool';
import { updateCollectionColumnsTool } from '../tools/mcp.update-collection-columns.tool';
import { updateRowTool } from '../tools/mcp.update-row.tool';
import { updateViewTool } from '../tools/mcp.update-view.tool';
import type { McpToolDefinition } from '../types/mcp.types';

/** Todas las herramientas, en el orden en que se le presentan al agente. Agregar una es sumarla aquí. */
export const MCP_TOOLS: readonly McpToolDefinition[] = [
  searchTool,
  fetchTool,
  listSpacesTool,
  listPagesTool,
  getCollectionTool,
  queryCollectionTool,
  createRowTool,
  updateRowTool,
  updateCollectionColumnsTool,
  createViewTool,
  updateViewTool,
  deleteViewTool,
];
