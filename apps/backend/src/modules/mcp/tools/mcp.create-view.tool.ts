import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import {
  describeMcpCollectionAsSeen,
  openMcpCollectionWithPeople,
  readMcpColumnsInHand,
  saveMcpCollectionShape,
} from '../lib/mcp.collections.lib';
import { requireMcpInput } from '../lib/mcp.page-access.lib';
import { buildMcpViewConfiguration } from '../lib/mcp.view-configuration.lib';
import { addMcpView } from '../lib/mcp.views.lib';
import { collectionOutputSchema, createViewInputSchema } from '../schemas/mcp.collections.schemas';
import type { McpCollectionOutput, McpCreateViewInput, McpOpenCollection } from '../types/mcp.collections.types';
import type { McpCall, McpPerson, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const addView = (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  people: readonly McpPerson[],
  input: McpCreateViewInput,
): Promise<McpOpenCollection> => {
  const { properties, views } = collection.shape;
  const configuration = requireMcpInput(buildMcpViewConfiguration(readMcpColumnsInHand(collection), input, people, {}));
  const view = { configuration, isDefault: false, name: input.name, type: input.type };
  const withView = requireMcpInput(addMcpView(views, view, input.makeDefault === true));
  return saveMcpCollectionShape(dependencies, call, collection, { properties, views: withView });
};

const createView = async (
  dependencies: McpServerDependencies,
  input: McpCreateViewInput,
  { call, record }: McpWriteSession,
): Promise<McpCollectionOutput> => {
  const [collection, people] = await openMcpCollectionWithPeople(
    dependencies,
    call,
    input.collection,
    ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
  );
  const request = {
    blockIds: [],
    detail: { type: input.type, view: input.name },
    pageId: collection.id,
    tool: MCP_TOOL_NAMES.createView,
  };
  const saved = await record(request, () => addView(dependencies, call, collection, people, input));
  return describeMcpCollectionAsSeen(dependencies.portalUrl, call, saved);
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
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.collection, tool: MCP_TOOL_NAMES.createView },
          (session) => createView(dependencies, input, session),
          (output) => `View created.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
