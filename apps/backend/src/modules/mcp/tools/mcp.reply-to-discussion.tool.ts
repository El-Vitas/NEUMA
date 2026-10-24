import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { describeMcpDiscussion, formatMcpDiscussionText } from '../lib/mcp.discussions.lib';
import { openMcpPage, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { repliedDiscussionOutputSchema, replyToDiscussionInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpRepliedDiscussionOutput, McpReplyToDiscussionInput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const replyToDiscussion = async (
  dependencies: McpServerDependencies,
  input: McpReplyToDiscussionInput,
  { call, record }: McpWriteSession,
): Promise<McpRepliedDiscussionOutput> => {
  const existing = requireMcpSuccess(await dependencies.discussions.getDiscussion(call.viewer, input.discussion));
  const { page } = await openMcpPage(dependencies, call, existing.pageId, ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const request = {
    blockIds: [existing.blockId],
    detail: { discussion: existing.id },
    pageId: page.id,
    tool: MCP_TOOL_NAMES.replyToDiscussion,
  };
  const replied = await record(request, async () =>
    requireMcpSuccess(await dependencies.discussions.reply(call.viewer, existing.id, [{ insert: input.text }])),
  );
  return {
    discussion: describeMcpDiscussion(replied),
    page: { id: page.id, title: page.title, url: buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, null) },
  };
};

export const replyToDiscussionTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.replyToDiscussion,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.replyToDiscussion,
      {
        description:
          'Reply in a discussion of a page, signed as the person who owns this token. Find the discussion id with list_discussions or fetch. Anyone in the thread who can still read the block is told about the reply. Returns the whole discussion as it is now.',
        inputSchema: replyToDiscussionInputSchema,
        outputSchema: repliedDiscussionOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.discussion, tool: MCP_TOOL_NAMES.replyToDiscussion },
          (session) => replyToDiscussion(dependencies, input, session),
          (output) => formatMcpDiscussionText(output.discussion),
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
