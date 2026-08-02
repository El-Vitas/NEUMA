import { pageContentSchema } from '@company-brain/shared';
import { McpServer } from '@modelcontextprotocol/server';
import {
  getPageInputSchema,
  getPageOutputSchema,
  listSpacesInputSchema,
  listSpacesOutputSchema,
} from './schemas/mcp.schemas';
import type { McpPage, McpPrincipal, McpServerDependencies } from './types/mcp.types';

const inaccessibleResourceMessage = 'Resource not accessible.';

const resolvePrincipal = async (dependencies: McpServerDependencies): Promise<McpPrincipal> => {
  const principal = await dependencies.principalResolver.resolve();
  if (principal === null) throw new Error(inaccessibleResourceMessage);
  return principal;
};

const resolveWorkspace = async (dependencies: McpServerDependencies, principal: McpPrincipal) =>
  dependencies.workspacesService.resolveForUser(principal.userId, principal.role);

const findAccessiblePage = async (dependencies: McpServerDependencies, pageId: string): Promise<McpPage> => {
  const principal = await resolvePrincipal(dependencies);
  const workspace = await resolveWorkspace(dependencies, principal);
  const result = await dependencies.pagesService.getAccessible(pageId, workspace.id, principal.userId, principal.role);
  if (result.isFail()) throw new Error(inaccessibleResourceMessage);
  const page = result.getValue();
  return { ...page, content: pageContentSchema.parse(page.content) };
};

const createToolError = (dependencies: McpServerDependencies, error: unknown) => {
  dependencies.errorReporter?.report(error);
  return {
    content: [{ type: 'text' as const, text: inaccessibleResourceMessage }],
    isError: true,
  };
};

export const createMcpServer = (dependencies: McpServerDependencies): McpServer => {
  const server = new McpServer({ name: 'company-brain', version: '0.0.1' });

  server.registerTool(
    'mcp.listSpaces',
    {
      description: 'List spaces accessible to the authenticated principal.',
      inputSchema: listSpacesInputSchema,
      outputSchema: listSpacesOutputSchema,
    },
    async () => {
      try {
        const principal = await resolvePrincipal(dependencies);
        const workspace = await resolveWorkspace(dependencies, principal);
        const spaces = await dependencies.spacesService.listAccessible(workspace.id, principal.userId, principal.role);
        const output = listSpacesOutputSchema.parse({ spaces });
        return { content: [{ type: 'text' as const, text: JSON.stringify(output) }], structuredContent: output };
      } catch (error) {
        return createToolError(dependencies, error);
      }
    },
  );

  server.registerTool(
    'mcp.getPage',
    {
      description: 'Fetch a page accessible to the authenticated principal.',
      inputSchema: getPageInputSchema,
      outputSchema: getPageOutputSchema,
    },
    async ({ pageId }) => {
      try {
        const accessiblePage = await findAccessiblePage(dependencies, pageId);
        const output = getPageOutputSchema.parse({ page: accessiblePage });
        return { content: [{ type: 'text' as const, text: JSON.stringify(output) }], structuredContent: output };
      } catch (error) {
        return createToolError(dependencies, error);
      }
    },
  );

  return server;
};
