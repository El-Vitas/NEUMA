import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { describeMcpCollection, formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import { openMcpCollection, requireMcpView, saveMcpCollectionShape } from '../lib/mcp.collections.lib';
import { requireMcpInput } from '../lib/mcp.page-access.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { removeMcpView } from '../lib/mcp.views.lib';
import { collectionOutputSchema, deleteViewInputSchema } from '../schemas/mcp.collections.schemas';
import type { McpDeleteViewInput, McpOpenCollection } from '../types/mcp.collections.types';
import type { McpCall, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

const deleteView = (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  input: McpDeleteViewInput,
): Promise<McpOpenCollection> => {
  const { properties, views } = collection.shape;
  const remaining = requireMcpInput(removeMcpView(views, requireMcpView(collection, input.view)));
  return saveMcpCollectionShape(dependencies, call, collection, { properties, views: remaining });
};

/** Quita una vista de una colección. Las filas no se tocan: solo deja de existir esa manera de mirarlas. */
export const deleteViewTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.deleteView,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.deleteView,
      {
        description:
          'Remove a view from a collection. Its rows are not touched; only that way of looking at them goes away. A collection keeps at least one view.',
        inputSchema: deleteViewInputSchema,
        outputSchema: collectionOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.deleteView,
          async () => {
            const call = await openMcpCall(dependencies);
            const collection = await openMcpCollection(
              dependencies,
              call,
              input.collection,
              ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
            );
            const request = {
              blockIds: [],
              detail: { view: input.view },
              pageId: collection.id,
              tool: MCP_TOOL_NAMES.deleteView,
            };
            const saved = await recordMcpWrite(dependencies, call, request, () =>
              deleteView(dependencies, call, collection, input),
            );
            return describeMcpCollection(dependencies.portalUrl, saved);
          },
          (output) => `View removed.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
