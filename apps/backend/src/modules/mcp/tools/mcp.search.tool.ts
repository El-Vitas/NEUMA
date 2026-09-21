import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import type { SearchQuery } from '../../../common/types/search.types';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { readMcpSearchSpaces } from '../lib/mcp.access.lib';
import { requireMcpPrincipal, resolveMcpWorkspace, runMcpTool } from '../lib/mcp.tool.lib';
import { searchCompanyBrainInputSchema, searchCompanyBrainOutputSchema } from '../schemas/mcp.schemas';
import type { McpPrincipal, McpSearchInput, McpSearchOutput, McpToolDefinition } from '../types/mcp.types';

/** Solo los filtros que se pidieron: uno vacío le diría al buscador que filtre por nada. */
const readSearchFilters = (input: McpSearchInput): Partial<SearchQuery> => ({
  ...(input.contentType === undefined ? {} : { contentType: input.contentType }),
  ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
  ...(input.sourceType === undefined ? {} : { sourceType: input.sourceType }),
  ...(input.spaceId === undefined ? {} : { spaceId: input.spaceId }),
  ...(input.tags === undefined ? {} : { tags: input.tags }),
});

/**
 * El recorte del token, que sale de lo que tiene dado y nunca de lo que pide el
 * agente. El espacio que el agente pida se suma como otro filtro: solo puede
 * achicar la búsqueda, no ampliarla.
 */
const readTokenScope = (principal: McpPrincipal): Partial<SearchQuery> => {
  const withinSpaceIds = readMcpSearchSpaces(principal);
  return withinSpaceIds === undefined ? {} : { withinSpaceIds };
};

/** Lo que lee el modelo: cada resultado en dos líneas, y cómo pedir más si hay. */
const formatSearchText = (searchPage: McpSearchOutput): string => {
  const lines = searchPage.items.map(
    (item) => `${item.title} [${item.sourceType}/${item.contentType}] in ${item.spaceId}\n${item.snippet}`,
  );
  if (searchPage.nextCursor !== undefined) lines.push(`Next cursor: ${searchPage.nextCursor}`);
  return lines.length === 0 ? 'No matching company brain content.' : lines.join('\n');
};

export const searchTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.searchCompanyBrain,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.searchCompanyBrain,
      {
        description:
          'Search everything in Company Brain you can access. Start here whenever you are asked to find or look up information.',
        inputSchema: searchCompanyBrainInputSchema,
        outputSchema: searchCompanyBrainOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          async () => {
            const principal = await requireMcpPrincipal(dependencies);
            const workspace = await resolveMcpWorkspace(dependencies, principal);
            const searchPage = await dependencies.searchService.search({
              ...readSearchFilters(input),
              ...readTokenScope(principal),
              limit: input.limit,
              query: input.query,
              userId: principal.userId,
              userRole: principal.role,
              workspaceId: workspace.id,
            });
            return searchCompanyBrainOutputSchema.parse(searchPage);
          },
          formatSearchText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
