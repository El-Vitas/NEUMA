import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpPage, readMcpPageId } from '../lib/mcp.page-access.lib';
import {
  describeMcpWrittenBlocks,
  formatMcpWrittenBlocksText,
  prepareMcpParagraphs,
  writeMcpContent,
} from '../lib/mcp.page-writes.lib';
import { editMcpTable } from '../lib/mcp.tables.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { updateTableInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpTableChange, McpUpdateTableInput } from '../types/mcp.pages.types';
import type { McpCall, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

/**
 * Los párrafos de todo lo que se escribe en la tabla, armados de una vez y
 * devueltos a su lugar: primero las celdas que cambian, después las filas nuevas.
 */
const prepareChange = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  input: McpUpdateTableInput,
): Promise<McpTableChange> => {
  const cells = input.cells ?? [];
  const addRows = input.addRows ?? [];
  if (cells.length + addRows.length + (input.deleteRows?.length ?? 0) === 0)
    throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
  const paragraphs = await prepareMcpParagraphs(dependencies, call, [
    ...cells.map((cell) => cell.text),
    ...addRows.flat(),
  ]);
  let next = cells.length;
  return {
    addRows: addRows.map((row) => {
      const taken = paragraphs.slice(next, next + row.length);
      next += row.length;
      return taken;
    }),
    cells: cells.map((cell, index) => ({ column: cell.column, paragraph: paragraphs[index], row: cell.row })),
    deleteRows: input.deleteRows ?? [],
  };
};

/**
 * Cambia una tabla sin reescribirla: unas celdas, filas nuevas al final y
 * filas que se van. Lo que no se toca conserva su id, así sus comentarios y
 * los enlaces a sus celdas siguen donde estaban.
 */
export const updateTableTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.updateTable,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.updateTable,
      {
        description:
          'Change a table of a page without rewriting it: new text for some cells, rows added at the end, rows taken out. Rows and columns count from 1, the header being row 1, as fetch shows the table, and always refer to the table as it is before this change. Everything left alone keeps its id and its comments. Whoever has the page open sees it at once.',
        inputSchema: updateTableInputSchema,
        outputSchema: writtenBlocksOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.updateTable,
          async () => {
            const call = await openMcpCall(dependencies);
            const { page } = await openMcpPage(
              dependencies,
              call,
              readMcpPageId(input.page),
              ACCESS_TOKEN_PERMISSIONS.pagesWrite,
            );
            const change = await prepareChange(dependencies, call, input);
            const request = {
              blockIds: [input.table],
              detail: {
                addedRows: change.addRows?.length ?? 0,
                changedCells: change.cells?.length ?? 0,
                deletedRows: change.deleteRows?.length ?? 0,
              },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.updateTable,
            };
            const content = await recordMcpWrite(dependencies, call, request, () =>
              writeMcpContent(dependencies, call, page, editMcpTable(input.table, change)),
            );
            return describeMcpWrittenBlocks(dependencies, call, page, content, [input.table]);
          },
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
