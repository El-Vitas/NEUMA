import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpPage, readMcpPageId, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, formatMcpManagedPageText, requireMcpWholeTree } from '../lib/mcp.page-management.lib';
import { readMcpActor } from '../lib/mcp.tool.lib';
import { managedPageOutputSchema, trashPageInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpManagedPageOutput, McpTrashPageInput } from '../types/mcp.page-management.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const trashPage = async (
  dependencies: McpServerDependencies,
  input: McpTrashPageInput,
  { call, record }: McpWriteSession,
): Promise<McpManagedPageOutput> => {
  const opened = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesTrash);
  const pageId = opened.page.id;
  await requireMcpWholeTree(dependencies, call, pageId, ACCESS_TOKEN_PERMISSIONS.pagesTrash);
  const onPage = { ...readMcpActor(call), pageId };
  const preview = requireMcpSuccess(await dependencies.pages.previewTrashCascade(onPage));
  const request = {
    blockIds: [],
    detail: { childPages: preview.childPageCount },
    pageId,
    tool: MCP_TOOL_NAMES.trashPage,
  };
  await record(request, async () => requireMcpSuccess(await dependencies.pages.trash(onPage)));
  return { childPages: preview.childPageCount, page: describeMcpManagedPage(dependencies, call, opened) };
};

/** Needs its own permission, separate from write, on the page and on every descendant with its own rule. */
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
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.trashPage },
          (session) => trashPage(dependencies, input, session),
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesTrash],
};
