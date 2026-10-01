import { randomUUID } from 'node:crypto';
import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_INACCESSIBLE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, formatMcpManagedPageText, requireMcpWholeTree } from '../lib/mcp.page-management.lib';
import { openMcpCall, readMcpPlace, requireMcpPermissionAt, runMcpTool } from '../lib/mcp.tool.lib';
import { managedPageOutputSchema, restorePageInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

/**
 * Trae de vuelta una página de la papelera, y si se pide, las que se fueron
 * con ella. Una página que no está en la papelera de quien pide, o que el
 * token no alcanza, se contesta igual: no se dice si existe.
 */
export const restorePageTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.restorePage,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.restorePage,
      {
        description:
          'Bring a page back from the trash, and with withChildren the pages that went to the trash with it. Returns the page and how many pages under it came back.',
        inputSchema: restorePageInputSchema,
        outputSchema: managedPageOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.restorePage,
          async () => {
            const call = await openMcpCall(dependencies);
            const { role, userId } = call.principal;
            const workspaceId = call.workspace.id;
            const pageId = readMcpPageId(input.page);
            const trashed = await dependencies.pages.listTrashed(workspaceId, userId, role, null, null);
            const page = trashed.find((candidate) => candidate.id === pageId);
            if (page === undefined) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
            const place = await readMcpPlace(dependencies, page.id, workspaceId);
            requireMcpPermissionAt(call.principal, place, ACCESS_TOKEN_PERMISSIONS.pagesTrash);
            const withChildren = input.withChildren === true;
            if (withChildren)
              await requireMcpWholeTree(dependencies, call, page.id, ACCESS_TOKEN_PERMISSIONS.pagesTrash);
            const request = {
              blockIds: [],
              detail: { withChildren },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.restorePage,
            };
            const outcome = await recordMcpWrite(dependencies, call, request, async () =>
              requireMcpSuccess(
                await dependencies.pages.restore(page.id, userId, workspaceId, randomUUID(), role, withChildren),
              ),
            );
            return { childPages: outcome.restoredChildCount, page: describeMcpManagedPage(dependencies, page) };
          },
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesTrash],
};
