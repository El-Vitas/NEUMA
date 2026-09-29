import type { Prisma } from '@company-brain/db/generated';
import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import {
  canMcpActOnRow,
  describeMcpRow,
  openMcpCollection,
  requireMcpInput,
  requireMcpSuccess,
  requireMcpView,
} from '../lib/mcp.collections.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { buildMcpViewConfiguration } from '../lib/mcp.view-configuration.lib';
import { queryCollectionInputSchema, queryCollectionOutputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpOpenCollection,
  McpQueryCollectionInput,
  McpQueryCollectionOutput,
} from '../types/mcp.collections.types';
import type { McpPerson, McpToolDefinition } from '../types/mcp.types';

/**
 * El filtro y el orden de la consulta: los de la vista que nombró, si nombró
 * una, con lo que pidió aparte encima.
 */
const buildQueryConfiguration = (
  collection: McpOpenCollection,
  input: McpQueryCollectionInput,
  people: readonly McpPerson[],
): Prisma.InputJsonObject => {
  const base = input.view === undefined ? {} : requireMcpView(collection, input.view).configuration;
  const shape = {
    ...(input.sort === undefined ? {} : { sort: input.sort }),
    ...(input.where === undefined ? {} : { where: input.where }),
  };
  return requireMcpInput(buildMcpViewConfiguration(collection.shape.properties, shape, people, base));
};

const formatQueryText = (output: McpQueryCollectionOutput): string => {
  if (output.rows.length === 0) return 'No rows match.';
  const more =
    output.nextCursor === undefined
      ? ''
      : `\n${String(output.total)} rows match; read the rest with cursor ${output.nextCursor}.`;
  const truncated = output.truncated
    ? '\nThe collection holds more rows than Company Brain reads at once; narrow the query with where to reach the rest.'
    : '';
  return `${output.rows.map(formatMcpRowText).join('\n')}${more}${truncated}`;
};

/**
 * Las filas de una colección que cumplen unas condiciones, en un orden: las
 * tareas pendientes de alguien, las que vencen esta semana.
 *
 * Filtra y ordena el mismo código que usa una vista del portal, así lo que
 * contesta el agente es lo que una persona vería con esa vista. Solo cuenta
 * las filas que el token deja leer.
 */
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
            const start = input.cursor === undefined ? 0 : Number(input.cursor);
            const end = start + input.limit;
            return queryCollectionOutputSchema.parse({
              ...(end < readable.length ? { nextCursor: String(end) } : {}),
              rows: readable
                .slice(start, end)
                .map((row) => describeMcpRow(dependencies.portalUrl, collection.shape, row, people)),
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
