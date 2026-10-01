import { randomUUID } from 'node:crypto';
import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpPage, readMcpPageId, requireMcpSuccess, resolveMcpCreationPlace } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, formatMcpManagedPageText, requireMcpWholeTree } from '../lib/mcp.page-management.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { managedPageOutputSchema, movePageInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

/**
 * Mueve una página, con todo lo que cuelga de ella, bajo otra página o arriba
 * de un espacio. El token tiene que poder escribir donde está, donde va y en
 * cada página de abajo que tenga su propia regla.
 */
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
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.movePage,
          async () => {
            const call = await openMcpCall(dependencies);
            const { page } = await openMcpPage(
              dependencies,
              call,
              readMcpPageId(input.page),
              ACCESS_TOKEN_PERMISSIONS.pagesWrite,
            );
            const destination = await resolveMcpCreationPlace(dependencies, call, input, []);
            await requireMcpWholeTree(dependencies, call, page.id, ACCESS_TOKEN_PERMISSIONS.pagesWrite);
            const { role, userId } = call.principal;
            const request = {
              blockIds: [],
              detail: { parentId: destination.parentId, spaceId: destination.spaceId },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.movePage,
            };
            const moved = await recordMcpWrite(dependencies, call, request, async () =>
              requireMcpSuccess(
                await dependencies.pages.move(
                  page.id,
                  destination.parentId,
                  destination.spaceId,
                  userId,
                  call.workspace.id,
                  randomUUID(),
                  role,
                ),
              ),
            );
            return { page: describeMcpManagedPage(dependencies, moved) };
          },
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
