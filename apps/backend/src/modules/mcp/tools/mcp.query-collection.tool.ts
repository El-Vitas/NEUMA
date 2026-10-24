import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { MCP_QUERY_DESCRIPTION } from '../constants/mcp.query.constants';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { listMcpClosedRowIds, openMcpCollection } from '../lib/mcp.collections.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpQueryAnswer, pickMcpQueryColumns, planMcpQuery } from '../lib/mcp.query.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { queryCollectionInputSchema, queryCollectionOutputSchema } from '../schemas/mcp.collections.schemas';
import type { McpQueryCollectionOutput } from '../types/mcp.collections.types';
import type { McpToolDefinition } from '../types/mcp.types';

const formatGroupLine = (group: NonNullable<McpQueryCollectionOutput['groups']>[number]): string => {
  const aggregates = group.aggregates === undefined ? '' : ` ${JSON.stringify(group.aggregates)}`;
  const more = group.nextCursor === undefined ? '' : `\n  more rows: cursor ${group.nextCursor}`;
  const rows = group.rows.map(formatMcpRowText).join('\n');
  const rowLines = rows === '' ? '' : `\n${rows}`;
  return `## ${group.name}: ${String(group.count)} rows${aggregates}${rowLines}${more}`;
};

const formatQueryText = (output: McpQueryCollectionOutput): string => {
  const totals = output.aggregates === undefined ? '' : `\nTotals: ${JSON.stringify(output.aggregates)}`;
  const header = `${String(output.total)} rows match.${totals}`;
  if (output.groups !== undefined) {
    const more = output.hasMoreGroups === true ? '\nThere are more groups than this answer carries.' : '';
    return [header, ...output.groups.map(formatGroupLine)].join('\n') + more;
  }
  const rows = output.rows.map(formatMcpRowText).join('\n');
  const next = output.nextCursor === undefined ? '' : `\nRead the rest with cursor ${output.nextCursor}.`;
  const rowLines = rows === '' ? '' : `\n${rows}`;
  return `${header}${rowLines}${next}`;
};

/** Uses the portal's query, so what an agent counts is what a person sees; counts only rows the token can read. */
export const queryCollectionTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.queryCollection,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.queryCollection,
      {
        description: MCP_QUERY_DESCRIPTION,
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
            const plan = requireMcpInput(planMcpQuery(collection, people, input));
            const columns = requireMcpInput(pickMcpQueryColumns(collection, input));
            const answer = requireMcpSuccess(
              await dependencies.collections.queryCollection({
                excludedRowIds: listMcpClosedRowIds(call, collection),
                pageId: collection.id,
                request: plan.request,
                role: principal.role,
                userId: principal.userId,
                workspaceId: workspace.id,
              }),
            );
            return queryCollectionOutputSchema.parse(
              describeMcpQueryAnswer(dependencies.portalUrl, collection, people, plan, answer, columns),
            );
          },
          formatQueryText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsRead],
};
