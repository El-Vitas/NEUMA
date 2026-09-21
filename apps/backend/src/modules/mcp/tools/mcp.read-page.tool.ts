import { ACCESS_TOKEN_PERMISSIONS, pageContentSchema } from '@company-brain/shared';
import { MCP_INACCESSIBLE_MESSAGE, MCP_TOOL_NAMES, MCP_UNREADABLE_PAGE_MESSAGE } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { requireMcpPermissionIn, requireMcpPrincipal, resolveMcpWorkspace, runMcpTool } from '../lib/mcp.tool.lib';
import { getPageInputSchema, getPageOutputSchema } from '../schemas/mcp.schemas';
import type { McpPage, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

/**
 * La página, si el dueño la ve y el token lee páginas en su espacio.
 * Las dos negativas se contestan igual, así una no delata a la otra.
 */
const findReadablePage = async (dependencies: McpServerDependencies, pageId: string): Promise<McpPage> => {
  const principal = await requireMcpPrincipal(dependencies);
  const workspace = await resolveMcpWorkspace(dependencies, principal);
  const result = await dependencies.pagesService.getAccessible(pageId, workspace.id, principal.userId, principal.role);
  if (result.isFail()) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  const page = result.getValue();
  requireMcpPermissionIn(principal, page.spaceId, ACCESS_TOKEN_PERMISSIONS.pagesRead);
  const content = pageContentSchema.safeParse(page.content);
  if (!content.success) throw new McpToolError(MCP_UNREADABLE_PAGE_MESSAGE);
  return { ...page, content: content.data };
};

export const readPageTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.readPage,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.readPage,
      {
        description: 'Read a page you can access, by its id.',
        inputSchema: getPageInputSchema,
        outputSchema: getPageOutputSchema,
      },
      async ({ pageId }) =>
        runMcpTool(dependencies, async () =>
          getPageOutputSchema.parse({ page: await findReadablePage(dependencies, pageId) }),
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
