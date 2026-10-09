import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpPage, readMcpPageId } from '../lib/mcp.page-access.lib';
import {
  describeMcpWrittenBlocks,
  formatMcpWrittenBlocksText,
  prepareMcpParagraphs,
  writeMcpContent,
} from '../lib/mcp.page-writes.lib';
import { editMcpTable } from '../lib/mcp.tables.lib';
import { updateTableInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpTableChange, McpUpdateTableInput, McpWrittenBlocksOutput } from '../types/mcp.pages.types';
import type { McpCall, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const splitIntoRows = <TParagraph>(
  paragraphs: readonly TParagraph[],
  rows: readonly (readonly string[])[],
): TParagraph[][] =>
  rows.reduce<{ readonly at: number; readonly rows: TParagraph[][] }>(
    (split, row) => ({
      at: split.at + row.length,
      rows: [...split.rows, paragraphs.slice(split.at, split.at + row.length)],
    }),
    { at: 0, rows: [] },
  ).rows;

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
  return {
    addRows: splitIntoRows(paragraphs.slice(cells.length), addRows),
    cells: cells.map((cell, index) => ({ column: cell.column, paragraph: paragraphs[index], row: cell.row })),
    deleteRows: input.deleteRows ?? [],
  };
};

const updateTable = async (
  dependencies: McpServerDependencies,
  input: McpUpdateTableInput,
  { call, record }: McpWriteSession,
): Promise<McpWrittenBlocksOutput> => {
  const opened = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const change = await prepareChange(dependencies, call, input);
  const request = {
    blockIds: [input.table],
    detail: {
      addedRows: change.addRows?.length ?? 0,
      changedCells: change.cells?.length ?? 0,
      deletedRows: change.deleteRows?.length ?? 0,
    },
    pageId: opened.page.id,
    tool: MCP_TOOL_NAMES.updateTable,
  };
  const content = await record(request, () =>
    writeMcpContent(dependencies, call, opened.page, editMcpTable(input.table, change)),
  );
  return describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, [input.table]);
};

/** Untouched parts keep their ids so comments and cell links stay attached. */
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
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.updateTable },
          (session) => updateTable(dependencies, input, session),
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
