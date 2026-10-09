import { ACCESS_TOKEN_PERMISSIONS, removePageBlocks } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpPage, readMcpPageId } from '../lib/mcp.page-access.lib';
import { describeMcpWrittenBlocks, writeMcpContent } from '../lib/mcp.page-writes.lib';
import { deleteBlocksInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpDeleteBlocksInput, McpWrittenBlocksOutput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const formatDeletedText = (output: McpWrittenBlocksOutput): string =>
  `Removed ${String(output.blockIds.length)} block(s) from ${output.page.title} — ${output.page.url}`;

const deleteBlocks = async (
  dependencies: McpServerDependencies,
  input: McpDeleteBlocksInput,
  { call, record }: McpWriteSession,
): Promise<McpWrittenBlocksOutput> => {
  const opened = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const request = { blockIds: input.blocks, detail: {}, pageId: opened.page.id, tool: MCP_TOOL_NAMES.deleteBlocks };
  const content = await record(request, () =>
    writeMcpContent(dependencies, call, opened.page, (current) => removePageBlocks(current, input.blocks)),
  );
  const described = await describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, []);
  return { ...described, blockIds: input.blocks };
};

/**
 * Quita bloques de una página, con todo lo que llevan dentro. Si alguno ya no
 * está, no se quita ninguno: el agente vuelve a leer antes de seguir.
 */
export const deleteBlocksTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.deleteBlocks,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.deleteBlocks,
      {
        description:
          'Remove blocks from a page by their ids, with everything inside them. If one of them is no longer there, nothing is removed.',
        inputSchema: deleteBlocksInputSchema,
        outputSchema: writtenBlocksOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.deleteBlocks },
          (session) => deleteBlocks(dependencies, input, session),
          formatDeletedText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
