import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpTrashedPage, readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, formatMcpManagedPageText, requireMcpWholeTree } from '../lib/mcp.page-management.lib';
import { readMcpActor } from '../lib/mcp.tool.lib';
import { managedPageOutputSchema, restorePageInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpManagedPageOutput, McpRestorePageInput } from '../types/mcp.page-management.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const restorePage = async (
  dependencies: McpServerDependencies,
  input: McpRestorePageInput,
  { call, record }: McpWriteSession,
): Promise<McpManagedPageOutput> => {
  const opened = await openMcpTrashedPage(
    dependencies,
    call,
    readMcpPageId(input.page),
    ACCESS_TOKEN_PERMISSIONS.pagesTrash,
  );
  const pageId = opened.page.id;
  const withChildren = input.withChildren === true;
  if (withChildren) await requireMcpWholeTree(dependencies, call, pageId, ACCESS_TOKEN_PERMISSIONS.pagesTrash);
  const request = { blockIds: [], detail: { withChildren }, pageId, tool: MCP_TOOL_NAMES.restorePage };
  const outcome = await record(request, async () =>
    requireMcpSuccess(
      await dependencies.pages.restore({ ...readMcpActor(call), includeChildren: withChildren, pageId }),
    ),
  );
  return { childPages: outcome.restoredChildCount, page: describeMcpManagedPage(dependencies, call, opened) };
};

/** A page the token cannot reach is answered as missing. */
export const restorePageTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.restorePage,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.restorePage,
      {
        description:
          'Bring a page back from the trash, and with withChildren the pages that went to the trash with it. Returns the page and how many pages under it came back. list_trash shows what is there.',
        inputSchema: restorePageInputSchema,
        outputSchema: managedPageOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.restorePage },
          (session) => restorePage(dependencies, input, session),
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesTrash],
};
