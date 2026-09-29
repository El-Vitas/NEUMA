import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_INACCESSIBLE_MESSAGE, MCP_LIST_PAGES_PLACE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { listPagesInputSchema, listPagesOutputSchema } from '../schemas/mcp.schemas';
import type {
  McpCall,
  McpListPagesInput,
  McpListPagesOutput,
  McpServerDependencies,
  McpToolDefinition,
} from '../types/mcp.types';

/** Desde dónde listar: una página que el agente puede ver, o la raíz de un espacio. */
const resolveListingPlace = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  input: McpListPagesInput,
): Promise<{ readonly parentId: string | null; readonly spaceId: string }> => {
  if (input.parentPageId !== undefined) {
    const [parent] = await dependencies.outline.listReadable([input.parentPageId], call.viewer);
    if (parent === undefined) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
    return { parentId: parent.id, spaceId: parent.spaceId };
  }
  if (input.spaceId !== undefined) return { parentId: null, spaceId: input.spaceId };
  throw new McpToolError(MCP_LIST_PAGES_PLACE_MESSAGE);
};

const formatListText = (output: McpListPagesOutput): string => {
  if (output.pages.length === 0) return 'No pages here that you can access.';
  return output.pages
    .map((page) => {
      const kind = page.isCollection ? 'collection' : 'page';
      return `- ${page.title} (${kind} ${page.id}, ${String(page.childCount)} under it) ${page.url}`;
    })
    .join('\n');
};

/**
 * Un nivel del árbol: las páginas que cuelgan de un padre, cada una con cuántas
 * tiene debajo. Solo las que el agente puede ver, y solo esas se cuentan.
 */
export const listPagesTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.listPages,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.listPages,
      {
        description:
          'Browse the page tree one level at a time: the pages at the top of a space, or the pages right under a page. Each comes with how many pages are under it.',
        inputSchema: listPagesInputSchema,
        outputSchema: listPagesOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          async () => {
            const call = await openMcpCall(dependencies);
            const place = await resolveListingPlace(dependencies, call, input);
            const children = await dependencies.outline.listChildren(place.spaceId, place.parentId, call.viewer);
            return listPagesOutputSchema.parse({
              pages: children.map((child) => ({
                ...child,
                url: buildMcpPageUrl(dependencies.portalUrl, place.spaceId, child.id, null),
              })),
            });
          },
          formatListText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
