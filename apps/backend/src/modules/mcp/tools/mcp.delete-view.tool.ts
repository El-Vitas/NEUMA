import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import {
  describeMcpCollectionAsSeen,
  openMcpCollection,
  requireMcpView,
  saveMcpCollectionShape,
} from '../lib/mcp.collections.lib';
import { requireMcpInput } from '../lib/mcp.page-access.lib';
import { removeMcpView } from '../lib/mcp.views.lib';
import { collectionOutputSchema, deleteViewInputSchema } from '../schemas/mcp.collections.schemas';
import type { McpCollectionOutput, McpDeleteViewInput, McpOpenCollection } from '../types/mcp.collections.types';
import type { McpCall, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const removeView = (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  input: McpDeleteViewInput,
): Promise<McpOpenCollection> => {
  const { properties, views } = collection.shape;
  const remaining = requireMcpInput(removeMcpView(views, requireMcpView(collection, input.view)));
  return saveMcpCollectionShape(dependencies, call, collection, { properties, views: remaining });
};

const deleteView = async (
  dependencies: McpServerDependencies,
  input: McpDeleteViewInput,
  { call, record }: McpWriteSession,
): Promise<McpCollectionOutput> => {
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
  const saved = await record(request, () => removeView(dependencies, call, collection, input));
  return describeMcpCollectionAsSeen(dependencies.portalUrl, call, saved);
};

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
        runMcpWrite(
          dependencies,
          { target: input.collection, tool: MCP_TOOL_NAMES.deleteView },
          (session) => deleteView(dependencies, input, session),
          (output) => `View removed.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
