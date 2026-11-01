import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { describeMcpDiscussion, formatMcpDiscussionsText } from '../lib/mcp.discussions.lib';
import { openMcpPage, readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { listDiscussionsInputSchema, listDiscussionsOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpListDiscussionsInput, McpListDiscussionsOutput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

const listDiscussions = async (
  dependencies: McpServerDependencies,
  input: McpListDiscussionsInput,
): Promise<McpListDiscussionsOutput> => {
  const call = await openMcpCall(dependencies);
  const { page } = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesRead);
  const listed = requireMcpSuccess(
    await dependencies.discussions.listPageDiscussions(call.viewer, page.id, {
      cursor: input.cursor,
      includeResolved: input.includeResolved ?? false,
    }),
  );
  return {
    discussions: listed.discussions.map(describeMcpDiscussion),
    ...(listed.nextCursor === null ? {} : { nextCursor: listed.nextCursor }),
    page: { id: page.id, title: page.title, url: buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, null) },
  };
};

export const listDiscussionsTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.listDiscussions,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.listDiscussions,
      {
        description:
          'List the discussions of a page: the conversations people and agents had about its blocks or about some of their words, each with its comments in order. Only discussions on blocks this token can read come back. By default only open ones; ask for the resolved ones with includeResolved. Answer one with reply_to_discussion, using the discussion id.',
        inputSchema: listDiscussionsInputSchema,
        outputSchema: listDiscussionsOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.listDiscussions,
          () => listDiscussions(dependencies, input),
          (output) => formatMcpDiscussionsText(output.discussions, output.nextCursor),
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
