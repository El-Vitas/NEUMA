import type { JsonObject } from '@neuma/db';
import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { readMcpOffset } from '../lib/mcp.address.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import {
  canMcpActOnRow,
  describeMcpRow,
  openMcpCollection,
  readMcpColumnsInHand,
  requireMcpView,
} from '../lib/mcp.collections.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { buildMcpViewConfiguration } from '../lib/mcp.view-configuration.lib';
import { queryCollectionInputSchema, queryCollectionOutputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpOpenCollection,
  McpQueryCollectionInput,
  McpQueryCollectionOutput,
} from '../types/mcp.collections.types';
import type { McpAssignablePerson, McpToolDefinition } from '../types/mcp.types';

const buildQueryConfiguration = (
  collection: McpOpenCollection,
  input: McpQueryCollectionInput,
  people: readonly McpAssignablePerson[],
): JsonObject => {
  const base = input.view === undefined ? {} : requireMcpView(collection, input.view).configuration;
  const shape = {
    ...(input.sort === undefined ? {} : { sort: input.sort }),
    ...(input.where === undefined ? {} : { where: input.where }),
  };
  return requireMcpInput(buildMcpViewConfiguration(readMcpColumnsInHand(collection), shape, people, base));
};

const formatQueryText = (output: McpQueryCollectionOutput): string => {
  if (output.rows.length === 0) return 'No rows match.';
  const more =
    output.nextCursor === undefined
      ? ''
      : `\n${String(output.total)} rows match; read the rest with cursor ${output.nextCursor}.`;
  const truncated = output.truncated
    ? '\nThe collection is larger than one query looks through: only its first rows, in the collection’s order, were searched. Rows further down may also match.'
    : '';
  return `${output.rows.map(formatMcpRowText).join('\n')}${more}${truncated}`;
};

/** Uses the portal's view code, so results match what a person sees. Counts only rows the token can read. */
export const queryCollectionTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.queryCollection,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.queryCollection,
      {
        description:
          'Find the rows of a collection that meet some conditions, in some order: the open tasks of a person, what is due this week, what is blocked. Name columns, options and people as they appear in get_collection. You can read the rows as one of its views shows them; where and sort given here replace that view’s own. Long results come in parts, with a cursor for the next one.',
        inputSchema: queryCollectionInputSchema,
        outputSchema: queryCollectionOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.queryCollection,
          async () => {
            const call = await openMcpCall(dependencies);
            const { principal, workspace } = call;
            const [collection, people] = await Promise.all([
              openMcpCollection(dependencies, call, input.collection, ACCESS_TOKEN_PERMISSIONS.collectionsRead),
              dependencies.people.listAssignableMembers(workspace.id),
            ]);
            const found = requireMcpSuccess(
              await dependencies.collections.queryRows({
                configuration: buildQueryConfiguration(collection, input, people),
                pageId: collection.id,
                role: principal.role,
                userId: principal.userId,
                viewName: null,
                workspaceId: workspace.id,
              }),
            );
            const readable = found.rows.filter((row) =>
              canMcpActOnRow(call, collection, row.id, ACCESS_TOKEN_PERMISSIONS.collectionsRead),
            );
            const start = readMcpOffset(input.cursor);
            const end = start + input.limit;
            // The titles of related rows are left out: a row of another collection may be closed to this token.
            const lookups = {
              files: new Map(found.attachedFiles.map((file) => [file.id, file.name])),
              rows: new Map<string, string>(),
            };
            return queryCollectionOutputSchema.parse({
              ...(end < readable.length ? { nextCursor: String(end) } : {}),
              rows: readable
                .slice(start, end)
                .map((row) => describeMcpRow(dependencies.portalUrl, collection.shape, row, people, lookups)),
              total: readable.length,
              truncated: found.hasMore,
            });
          },
          formatQueryText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsRead],
};
