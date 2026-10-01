import { randomUUID } from 'node:crypto';
import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpPage, readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, formatMcpManagedPageText, requireMcpWholeTree } from '../lib/mcp.page-management.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { managedPageOutputSchema, trashPageInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

/**
 * Manda una página a la papelera, con todo lo que cuelga de ella, como lo hace
 * una persona: nada se borra, y restore_page la trae de vuelta. Pide su propio
 * permiso, aparte de escribir, en la página y en cada una de abajo que tenga
 * su propia regla.
 */
export const trashPageTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.trashPage,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.trashPage,
      {
        description:
          'Send a page, with every page under it, to the trash, the way a person does from its menu. Nothing is erased: restore_page brings it back. Returns how many pages under it went along.',
        inputSchema: trashPageInputSchema,
        outputSchema: managedPageOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.trashPage,
          async () => {
            const call = await openMcpCall(dependencies);
            const { page } = await openMcpPage(
              dependencies,
              call,
              readMcpPageId(input.page),
              ACCESS_TOKEN_PERMISSIONS.pagesTrash,
            );
            await requireMcpWholeTree(dependencies, call, page.id, ACCESS_TOKEN_PERMISSIONS.pagesTrash);
            const { role, userId } = call.principal;
            const workspaceId = call.workspace.id;
            const preview = requireMcpSuccess(
              await dependencies.pages.previewTrashCascade(page.id, workspaceId, userId, role),
            );
            const request = {
              blockIds: [],
              detail: { childPages: preview.childPageCount },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.trashPage,
            };
            await recordMcpWrite(dependencies, call, request, async () =>
              requireMcpSuccess(await dependencies.pages.trash(page.id, userId, workspaceId, randomUUID(), role)),
            );
            return { childPages: preview.childPageCount, page: describeMcpManagedPage(dependencies, page) };
          },
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesTrash],
};
