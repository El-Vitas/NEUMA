import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { requireMcpRowChangeAllowed } from '../lib/mcp.collections.lib';
import { openMcpPage, readMcpPageId, requireMcpSuccess, resolveMcpCreationPlace } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, formatMcpManagedPageText, requireMcpWholeTree } from '../lib/mcp.page-management.lib';
import { readMcpActor } from '../lib/mcp.tool.lib';
import { managedPageOutputSchema, movePageInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpManagedPageOutput, McpMovePageInput } from '../types/mcp.page-management.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const movePage = async (
  dependencies: McpServerDependencies,
  input: McpMovePageInput,
  { call, record }: McpWriteSession,
): Promise<McpManagedPageOutput> => {
  const { page, place } = await openMcpPage(
    dependencies,
    call,
    readMcpPageId(input.page),
    ACCESS_TOKEN_PERMISSIONS.pagesWrite,
  );
  const destination = await resolveMcpCreationPlace(dependencies, call, input, []);
  await Promise.all([
    requireMcpRowChangeAllowed(dependencies, call, { parentId: page.parentId, place }),
    requireMcpRowChangeAllowed(dependencies, call, { parentId: destination.parentId, place: destination.parentPlace }),
  ]);
  await requireMcpWholeTree(dependencies, call, page.id, ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const request = {
    blockIds: [],
    detail: { parentId: destination.parentId, spaceId: destination.spaceId },
    pageId: page.id,
    tool: MCP_TOOL_NAMES.movePage,
  };
  const moved = await record(request, async () =>
    requireMcpSuccess(
      await dependencies.pages.move({
        ...readMcpActor(call),
        pageId: page.id,
        parentId: destination.parentId,
        spaceId: destination.spaceId,
      }),
    ),
  );
  const arrived = { lineage: [moved.id, ...destination.parentPlace.lineage], spaceId: destination.spaceId };
  return { page: describeMcpManagedPage(dependencies, call, { page: moved, place: arrived }) };
};

/** The token needs write access at the origin, the destination and every descendant with its own rule. */
export const movePageTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.movePage,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.movePage,
      {
        description:
          'Move a page, with every page under it, under another page (parent) or to the top of a space (space); name one of the two. A row of a collection moved into another collection must fit its columns.',
        inputSchema: movePageInputSchema,
        outputSchema: managedPageOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.movePage },
          (session) => movePage(dependencies, input, session),
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
