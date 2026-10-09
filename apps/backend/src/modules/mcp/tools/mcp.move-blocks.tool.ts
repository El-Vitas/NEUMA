import { ACCESS_TOKEN_PERMISSIONS, movePageBlocks } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { readMcpBlockPlace } from '../lib/mcp.block-update.lib';
import { openMcpPage, readMcpPageId, requireMcpInput } from '../lib/mcp.page-access.lib';
import { describeMcpWrittenBlocks, formatMcpWrittenBlocksText, writeMcpContent } from '../lib/mcp.page-writes.lib';
import { moveBlocksInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpMoveBlocksInput, McpWrittenBlocksOutput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const moveBlocks = async (
  dependencies: McpServerDependencies,
  input: McpMoveBlocksInput,
  { call, record }: McpWriteSession,
): Promise<McpWrittenBlocksOutput> => {
  const opened = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const place = requireMcpInput(readMcpBlockPlace(input));
  const request = {
    blockIds: input.blocks,
    detail: { place: JSON.stringify(place) },
    pageId: opened.page.id,
    tool: MCP_TOOL_NAMES.moveBlocks,
  };
  const content = await record(request, () =>
    writeMcpContent(dependencies, call, opened.page, (current) => movePageBlocks(current, input.blocks, place)),
  );
  return describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, input.blocks);
};

export const moveBlocksTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.moveBlocks,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.moveBlocks,
      {
        description:
          'Move blocks to another place on the same page: after or before a block, inside one, or to the start or end of the page. They keep their ids and what they hold, in the order they had.',
        inputSchema: moveBlocksInputSchema,
        outputSchema: writtenBlocksOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.moveBlocks },
          (session) => moveBlocks(dependencies, input, session),
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
