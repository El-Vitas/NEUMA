import { ACCESS_TOKEN_PERMISSIONS, insertPageBlocks } from '@company-brain/shared';
import { MCP_DIAGRAM_LOGOS_NOTE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { readMcpBlockPlace } from '../lib/mcp.block-update.lib';
import { openMcpPage, readMcpPageId, requireMcpInput } from '../lib/mcp.page-access.lib';
import {
  describeMcpWrittenBlocks,
  formatMcpWrittenBlocksText,
  listMcpWrittenBlockIds,
  prepareMcpBlocks,
  writeMcpContent,
} from '../lib/mcp.page-writes.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { insertBlocksInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

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
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.insertBlocks,
          async () => {
            const call = await openMcpCall(dependencies);
            const { page } = await openMcpPage(
              dependencies,
              call,
              readMcpPageId(input.page),
              ACCESS_TOKEN_PERMISSIONS.pagesWrite,
            );
            const place = requireMcpInput(readMcpBlockPlace(input));
            const prepared = await prepareMcpBlocks(dependencies, call, input.blocks);
            const request = {
              blockIds: prepared.blockIds,
              detail: { place: JSON.stringify(place) },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.insertBlocks,
            };
            const content = await recordMcpWrite(dependencies, call, request, () =>
              writeMcpContent(dependencies, call, page, (current) => insertPageBlocks(current, place, prepared.nodes)),
            );
            const written = listMcpWrittenBlockIds(content, prepared.nodes);
            return describeMcpWrittenBlocks(dependencies, call, page, content, written);
          },
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
