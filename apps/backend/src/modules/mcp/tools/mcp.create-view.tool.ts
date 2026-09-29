import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { describeMcpCollection, formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import { openMcpCollection, requireMcpInput, saveMcpCollectionShape } from '../lib/mcp.collections.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { buildMcpViewConfiguration } from '../lib/mcp.view-configuration.lib';
import { addMcpView } from '../lib/mcp.views.lib';
import { collectionOutputSchema, createViewInputSchema } from '../schemas/mcp.collections.schemas';
import type { McpCreateViewInput, McpOpenCollection } from '../types/mcp.collections.types';
import type { McpCall, McpPerson, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

const createView = (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  people: readonly McpPerson[],
  input: McpCreateViewInput,
): Promise<McpOpenCollection> => {
  const { properties, views } = collection.shape;
  const configuration = requireMcpInput(buildMcpViewConfiguration(properties, input, people, {}));
  const view = { configuration, isDefault: false, name: input.name, type: input.type };
  const withView = requireMcpInput(addMcpView(views, view, input.makeDefault === true));
  return saveMcpCollectionShape(dependencies, call, collection, { properties, views: withView });
};

/**
 * Agrega una manera de mirar las filas de una colección: una tabla, un
 * tablero agrupado por estado, una lista filtrada.
 */
export const createViewTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.createView,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.createView,
      {
        description:
          'Add a view to a collection: a new way to look at its rows, such as a board grouped by status or a table of what is due this week. A board or chart needs groupBy. Name columns, options and people as get_collection shows them.',
        inputSchema: createViewInputSchema,
        outputSchema: collectionOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          async () => {
            const call = await openMcpCall(dependencies);
            const [collection, people] = await Promise.all([
              openMcpCollection(dependencies, call, input.collection, ACCESS_TOKEN_PERMISSIONS.collectionsConfigure),
              dependencies.people.listAssignableMembers(call.workspace.id),
            ]);
            const request = {
              blockIds: [],
              detail: { type: input.type, view: input.name },
              pageId: collection.id,
              tool: MCP_TOOL_NAMES.createView,
            };
            const saved = await recordMcpWrite(dependencies, call, request, () =>
              createView(dependencies, call, collection, people, input),
            );
            return describeMcpCollection(dependencies.portalUrl, saved);
          },
          (output) => `View created.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
