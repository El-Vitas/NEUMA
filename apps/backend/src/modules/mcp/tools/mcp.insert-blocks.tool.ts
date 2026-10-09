import { ACCESS_TOKEN_PERMISSIONS, insertPageBlocks } from '@company-brain/shared';
import { MCP_DIAGRAM_LOGOS_NOTE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { readMcpBlockPlace } from '../lib/mcp.block-update.lib';
import { openMcpPage, readMcpPageId, requireMcpInput } from '../lib/mcp.page-access.lib';
import {
  describeMcpWrittenBlocks,
  formatMcpWrittenBlocksText,
  listMcpWrittenBlockIds,
  prepareMcpBlocks,
  writeMcpContent,
} from '../lib/mcp.page-writes.lib';
import { insertBlocksInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpInsertBlocksInput, McpWrittenBlocksOutput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const insertBlocks = async (
  dependencies: McpServerDependencies,
  input: McpInsertBlocksInput,
  { call, record }: McpWriteSession,
): Promise<McpWrittenBlocksOutput> => {
  const opened = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const place = requireMcpInput(readMcpBlockPlace(input));
  const prepared = await prepareMcpBlocks(dependencies, call, input.blocks);
  const request = {
    blockIds: prepared.blockIds,
    detail: { place: JSON.stringify(place) },
    pageId: opened.page.id,
    tool: MCP_TOOL_NAMES.insertBlocks,
  };
  const content = await record(request, () =>
    writeMcpContent(dependencies, call, opened.page, (current) => insertPageBlocks(current, place, prepared.nodes)),
  );
  const written = listMcpWrittenBlockIds(content, prepared.nodes);
  return describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, written);
};

/**
 * Escribe bloques nuevos en una página: al final, al principio, junto a un
 * bloque o dentro de uno. Se escriben sobre lo que la página dice en ese
 * momento, así lo que otra persona acaba de escribir no se pierde.
 */
export const insertBlocksTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.insertBlocks,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.insertBlocks,
      {
        description: `Write new blocks on a page: at its end (the default), at its start, right after or before a block, or inside one (under a list item, in a toggle). Say what each block is, not how it looks: a table is a table, a diagram drawn with spaces is a code_block. Whoever has the page open sees it at once. Returns the blocks as they were written, with their ids. ${MCP_DIAGRAM_LOGOS_NOTE}`,
        inputSchema: insertBlocksInputSchema,
        outputSchema: writtenBlocksOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.page, tool: MCP_TOOL_NAMES.insertBlocks },
          (session) => insertBlocks(dependencies, input, session),
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
