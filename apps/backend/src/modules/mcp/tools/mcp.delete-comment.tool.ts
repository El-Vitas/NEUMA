import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { removeMcpBlockComment } from '../lib/mcp.comments.lib';
import { openMcpPage, readMcpPageId } from '../lib/mcp.page-access.lib';
import { describeMcpWrittenBlocks, formatMcpWrittenBlocksText, writeMcpContent } from '../lib/mcp.page-writes.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { deleteCommentInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

/**
 * Quita un comentario de un bloque y de las palabras que marcaba, como lo
 * quita una persona cuando ya no dice nada útil.
 */
export const deleteCommentTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.deleteComment,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.deleteComment,
      {
        description:
          'Delete one comment from a block of a page, by the comment id fetch lists, for when it no longer says anything useful; the words it marked stop being marked. Returns the block as it is now.',
        inputSchema: deleteCommentInputSchema,
        outputSchema: writtenBlocksOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.deleteComment,
          async () => {
            const call = await openMcpCall(dependencies);
            const { page } = await openMcpPage(
              dependencies,
              call,
              readMcpPageId(input.page),
              ACCESS_TOKEN_PERMISSIONS.pagesWrite,
            );
            const request = {
              blockIds: [input.block],
              detail: { comment: input.comment },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.deleteComment,
            };
            const content = await recordMcpWrite(dependencies, call, request, () =>
              writeMcpContent(dependencies, call, page, removeMcpBlockComment(input.block, input.comment)),
            );
            return describeMcpWrittenBlocks(dependencies, call, page, content, [input.block]);
          },
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
