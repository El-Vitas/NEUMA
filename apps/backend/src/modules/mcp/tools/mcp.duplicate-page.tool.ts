import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpPage, readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, formatMcpManagedPageText, requireMcpWholeTree } from '../lib/mcp.page-management.lib';
import { openMcpCall, requireMcpPermissionAt, runMcpTool } from '../lib/mcp.tool.lib';
import { duplicatePageInputSchema, managedPageOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

/**
 * Hace una copia de una página justo al lado de ella, bajo la misma página de
 * arriba. El token tiene que poder escribir ahí; y si se copian las páginas de
 * abajo, poder leerlas todas, o la copia sacaría a la luz una que tiene cerrada.
 */
export const duplicatePageTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.duplicatePage,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.duplicatePage,
      {
        description:
          'Make a copy of a page right next to it, optionally with the pages under it and a title of its own. Returns the copy.',
        inputSchema: duplicatePageInputSchema,
        outputSchema: managedPageOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.duplicatePage,
          async () => {
            const call = await openMcpCall(dependencies);
            const { page, place } = await openMcpPage(
              dependencies,
              call,
              readMcpPageId(input.page),
              ACCESS_TOKEN_PERMISSIONS.pagesRead,
            );
            const beside = { lineage: place.lineage.slice(1), spaceId: place.spaceId };
            requireMcpPermissionAt(call.principal, beside, ACCESS_TOKEN_PERMISSIONS.pagesWrite);
            const withChildren = input.withChildren === true;
            if (withChildren)
              await requireMcpWholeTree(dependencies, call, page.id, ACCESS_TOKEN_PERMISSIONS.pagesRead);
            const { role, userId } = call.principal;
            const request = {
              blockIds: [],
              detail: { withChildren },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.duplicatePage,
            };
            const copy = await recordMcpWrite(dependencies, call, request, async () =>
              requireMcpSuccess(
                await dependencies.pages.duplicate(
                  page.id,
                  withChildren,
                  input.title ?? null,
                  userId,
                  call.workspace.id,
                  role,
                ),
              ),
            );
            return { page: describeMcpManagedPage(dependencies, copy) };
          },
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
