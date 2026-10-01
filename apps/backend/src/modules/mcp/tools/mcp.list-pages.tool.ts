import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_INACCESSIBLE_MESSAGE, MCP_LIST_PAGES_PLACE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { describeMcpOutlinePage, describeMcpRowPropertiesInOneLine } from '../lib/mcp.fetch.text.lib';
import { loadMcpRowDescriber } from '../lib/mcp.rows.lib';
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
  const lines = output.pages.map((page) => {
    const properties = page.properties === undefined ? '' : `\n  ${describeMcpRowPropertiesInOneLine(page.properties)}`;
    return `${describeMcpOutlinePage(page)}${properties}`;
  });
  const more =
    output.nextCursor === undefined
      ? ''
      : `\n${String(output.total)} in all; list the rest with cursor ${output.nextCursor}.`;
  return `${lines.join('\n')}${more}`;
};

/**
 * Un nivel del árbol: las páginas que cuelgan de un padre, cada una con cuántas
 * tiene debajo. Solo las que el agente puede ver, y solo esas se cuentan.
 *
 * Bajo una colección, cada fila trae sus propiedades: preguntar qué tareas hay
 * pendientes y de quién es cada una se contesta con una sola llamada, sin abrir
 * las tareas una por una. Van de a tramos, con un cursor para el siguiente.
 */
export const listPagesTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.listPages,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.listPages,
      {
        description:
          'Browse the page tree one level at a time: the pages at the top of a space, or the pages right under a page, each with how many pages are under it. Under a collection (a table or board of tasks), each row comes with its properties, such as status, assignee and due date. Long lists come in parts, with a cursor for the next one.',
        inputSchema: listPagesInputSchema,
        outputSchema: listPagesOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.listPages,
          async () => {
            const call = await openMcpCall(dependencies);
            const place = await resolveListingPlace(dependencies, call, input);
            const [children, describeRow] = await Promise.all([
              dependencies.outline.listChildren(place.spaceId, place.parentId, call.viewer),
              loadMcpRowDescriber(dependencies, call, place.parentId),
            ]);
            const start = input.cursor === undefined ? 0 : Number(input.cursor);
            const end = start + input.limit;
            return listPagesOutputSchema.parse({
              ...(end < children.length ? { nextCursor: String(end) } : {}),
              pages: children.slice(start, end).map((child) => {
                const properties = describeRow(child.propertyValues, child.title);
                return {
                  childCount: child.childCount,
                  id: child.id,
                  isCollection: child.isCollection,
                  ...(properties.length === 0 ? {} : { properties }),
                  title: child.title,
                  url: buildMcpPageUrl(dependencies.portalUrl, place.spaceId, child.id, null),
                };
              }),
              total: children.length,
            });
          },
          formatListText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
