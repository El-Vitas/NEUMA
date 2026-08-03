import { pageContentSchema } from '@company-brain/shared';
import { McpServer } from '@modelcontextprotocol/server';
import type { SearchQuery } from '../../common/types/search.types';
import {
  getPageInputSchema,
  getPageOutputSchema,
  listSpacesInputSchema,
  listSpacesOutputSchema,
  searchCompanyBrainInputSchema,
  searchCompanyBrainOutputSchema,
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

const isExpectedAccessError = (error: unknown): boolean =>
  error instanceof Error && error.message === inaccessibleResourceMessage;

const createToolError = (dependencies: McpServerDependencies, error: unknown) => {
  if (!isExpectedAccessError(error)) dependencies.errorReporter?.report(error);
  return {
    content: [{ type: 'text' as const, text: inaccessibleResourceMessage }],
    isError: true,
  };
};

const formatSearchText = (searchPage: ReturnType<typeof searchCompanyBrainOutputSchema.parse>): string => {
  const resultText = searchPage.items.map(
    (item) => `${item.title} [${item.sourceType}/${item.contentType}] in ${item.spaceId}\n${item.snippet}`,
  );
  if (searchPage.nextCursor !== undefined) resultText.push(`Next cursor: ${searchPage.nextCursor}`);
  return resultText.length === 0 ? 'No matching company brain content.' : resultText.join('\n');
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

  server.registerTool(
    'search_company_brain',
    {
      description: 'Search company brain content accessible to the authenticated principal.',
      inputSchema: searchCompanyBrainInputSchema,
      outputSchema: searchCompanyBrainOutputSchema,
    },
    async (input) => {
      try {
        const principal = await resolvePrincipal(dependencies);
        const workspace = await resolveWorkspace(dependencies, principal);
        const searchQuery: SearchQuery = {
          limit: input.limit,
          query: input.query,
          ...(input.contentType === undefined ? {} : { contentType: input.contentType }),
          ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
          ...(input.sourceType === undefined ? {} : { sourceType: input.sourceType }),
          ...(input.spaceId === undefined ? {} : { spaceId: input.spaceId }),
          ...(input.tags === undefined ? {} : { tags: input.tags }),
          userId: principal.userId,
          userRole: principal.role,
          workspaceId: workspace.id,
        };
        const searchPage = await dependencies.searchService.search(searchQuery);
        const output = searchCompanyBrainOutputSchema.parse(searchPage);
        return {
          content: [{ type: 'text' as const, text: formatSearchText(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return createToolError(dependencies, error);
      }
    },
  );

  return server;
};
