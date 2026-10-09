import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { describeMcpCollection, formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import { openMcpCollection } from '../lib/mcp.collections.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { collectionOutputSchema, getCollectionInputSchema } from '../schemas/mcp.collections.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

export const getCollectionTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.getCollection,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.getCollection,
      {
        description:
          'Read the shape of a collection (a table or board, such as a task board): its columns with the options each one accepts, and its views with what they group and filter. Read it before adding or changing rows, so you use the column and option names that exist.',
        inputSchema: getCollectionInputSchema,
        outputSchema: collectionOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.getCollection,
          async () => {
            const call = await openMcpCall(dependencies);
            const collection = await openMcpCollection(
              dependencies,
              call,
              input.collection,
              ACCESS_TOKEN_PERMISSIONS.collectionsRead,
            );
            return describeMcpCollection(dependencies.portalUrl, collection);
          },
          formatMcpCollectionText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsRead],
};
