import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { requireMcpRowChangeAllowed } from '../lib/mcp.collections.lib';
import { openMcpPage, readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, formatMcpManagedPageText, requireMcpWholeTree } from '../lib/mcp.page-management.lib';
import { readMcpActor, requireMcpPermissionAt } from '../lib/mcp.tool.lib';
import { duplicatePageInputSchema, managedPageOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpDuplicatePageInput, McpManagedPageOutput } from '../types/mcp.page-management.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const duplicatePage = async (
  dependencies: McpServerDependencies,
  input: McpDuplicatePageInput,
  { call, record }: McpWriteSession,
): Promise<McpManagedPageOutput> => {
  const { page, place } = await openMcpPage(
    dependencies,
    call,
    readMcpPageId(input.page),
    ACCESS_TOKEN_PERMISSIONS.pagesRead,
  );
  const besideLineage = place.lineage.slice(1);
  const beside = { lineage: besideLineage, spaceId: place.spaceId };
  requireMcpPermissionAt(call.principal, beside, ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  await requireMcpRowChangeAllowed(dependencies, call, { parentId: page.parentId, place: beside });
  const withChildren = input.withChildren === true;
  if (withChildren) await requireMcpWholeTree(dependencies, call, page.id, ACCESS_TOKEN_PERMISSIONS.pagesRead);
  const request = { blockIds: [], detail: { withChildren }, pageId: page.id, tool: MCP_TOOL_NAMES.duplicatePage };
  const copy = await record(
    request,
    async () =>
      requireMcpSuccess(
        await dependencies.pages.duplicate({
          ...readMcpActor(call),
          includeChildren: withChildren,
          pageId: page.id,
          title: input.title ?? null,
        }),
      ),
    (copied) => copied.id,
  );
  const copyPlace = { lineage: [copy.id, ...besideLineage], spaceId: place.spaceId };
  return { page: describeMcpManagedPage(dependencies, call, { page: copy, place: copyPlace }) };
};

/** Copying descendants needs read access to all of them, or the copy would expose a closed page. */
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
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.page, tool: MCP_TOOL_NAMES.duplicatePage },
          (session) => duplicatePage(dependencies, input, session),
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
