import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { removeMcpBlockComment } from '../lib/mcp.comments.lib';
import { openMcpPage, readMcpPageId } from '../lib/mcp.page-access.lib';
import { describeMcpWrittenBlocks, formatMcpWrittenBlocksText, writeMcpContent } from '../lib/mcp.page-writes.lib';
import { deleteCommentInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpDeleteCommentInput, McpWrittenBlocksOutput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const deleteComment = async (
  dependencies: McpServerDependencies,
  input: McpDeleteCommentInput,
  { call, record }: McpWriteSession,
): Promise<McpWrittenBlocksOutput> => {
  const opened = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const request = {
    blockIds: [input.block],
    detail: { comment: input.comment },
    pageId: opened.page.id,
    tool: MCP_TOOL_NAMES.deleteComment,
  };
  const content = await record(request, () =>
    writeMcpContent(dependencies, call, opened.page, removeMcpBlockComment(input.block, input.comment)),
  );
  return describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, [input.block]);
};

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
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.deleteComment },
          (session) => deleteComment(dependencies, input, session),
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
