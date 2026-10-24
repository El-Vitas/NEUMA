import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_INACCESSIBLE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { readMcpStoredContent, unmarkMcpDiscussion } from '../lib/mcp.comments.lib';
import { openMcpPage, readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpWrittenBlocks, formatMcpWrittenBlocksText, writeMcpContent } from '../lib/mcp.page-writes.lib';
import { deleteCommentInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpDeleteCommentInput, McpWrittenBlocksOutput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const deleteComment = async (
  dependencies: McpServerDependencies,
  input: McpDeleteCommentInput,
  { call, record }: McpWriteSession,
): Promise<McpWrittenBlocksOutput> => {
  const location = requireMcpSuccess(await dependencies.discussions.locateComment(call.viewer, input.comment));
  const opened = await openMcpPage(dependencies, call, location.pageId, ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  if (location.pageId !== readMcpPageId(input.page) || location.blockId !== input.block) {
    throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  }
  const request = {
    blockIds: [input.block],
    detail: { comment: input.comment },
    pageId: opened.page.id,
    tool: MCP_TOOL_NAMES.deleteComment,
  };
  const content = await record(request, async () => {
    const removed = requireMcpSuccess(await dependencies.discussions.removeComment(call.viewer, input.comment));
    if (!removed.discussionRemoved || !removed.wasAnchored) return readMcpStoredContent(opened.page.content);
    return writeMcpContent(dependencies, call, opened.page, unmarkMcpDiscussion(input.block, removed.discussionId));
  });
  return describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, [input.block]);
};

export const deleteCommentTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.deleteComment,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.deleteComment,
      {
        description:
          'Delete one comment of a discussion, by the comment id fetch and list_discussions show. You can delete your own comments, and the owner of the token can delete any if they are an admin. When it was the last comment of a discussion the discussion goes too, and the words it marked stop being marked. Returns the block as it is now.',
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
