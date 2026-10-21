import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { MCP_CHANGES_DESCRIPTION } from '../constants/mcp.query.constants';
import { describeMcpChanges, readMcpChangesWaiting } from '../lib/mcp.changes.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { listMcpClosedRowIds, openMcpCollection } from '../lib/mcp.collections.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { pickMcpQueryColumns } from '../lib/mcp.query.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { collectionChangesInputSchema, collectionChangesOutputSchema } from '../schemas/mcp.collections.schemas';
import type { McpCollectionChangesOutput } from '../types/mcp.collections.types';
import type { McpToolDefinition } from '../types/mcp.types';

const formatChangesText = (output: McpCollectionChangesOutput): string => {
  if (output.reset) {
    return `The cursor is not valid any more. Read the collection again with query_collection and watch from its changesCursor. New cursor: ${output.cursor}`;
  }
  const rows = output.rows.map(formatMcpRowText).join('\n');
  const trashed = output.trashed.length === 0 ? '' : `\nTrashed: ${output.trashed.join(', ')}`;
  const more = output.hasMore ? '\nThere are more changes: ask again with this cursor.' : '';
  const linked = output.possiblyChanged.map(formatMcpRowText).join('\n');
  const possibly = linked === '' ? '' : `\nRollups that may have changed:\n${linked}`;
  const truncated = output.possiblyChangedTruncated ? '\nThere are more of those: read the rollup columns again.' : '';
  const header = `${String(output.rows.length)} rows changed, ${String(output.total)} rows in all. Cursor: ${output.cursor}`;
  return `${header}${rows === '' ? '' : `\n${rows}`}${possibly}${truncated}${trashed}${more}`;
};

/** What changed in a collection since the last read, so an agent that follows a board does not read it all again. */
export const collectionChangesTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.collectionChanges,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.collectionChanges,
      {
        description: MCP_CHANGES_DESCRIPTION,
        inputSchema: collectionChangesInputSchema,
        outputSchema: collectionChangesOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.collectionChanges,
          async () => {
            const call = await openMcpCall(dependencies);
            const { principal, workspace } = call;
            const [collection, people] = await Promise.all([
              openMcpCollection(dependencies, call, input.collection, ACCESS_TOKEN_PERMISSIONS.collectionsRead),
              dependencies.people.listAssignableMembers(workspace.id),
            ]);
            const columns = requireMcpInput(pickMcpQueryColumns(collection, input));
            const excludedRowIds = listMcpClosedRowIds(call, collection);
            const answer = requireMcpSuccess(
              await readMcpChangesWaiting(
                (cursor) =>
                  dependencies.collections.readChanges({
                    cursor,
                    excludedRowIds,
                    limit: input.limit,
                    pageId: collection.id,
                    role: principal.role,
                    userId: principal.userId,
                    workspaceId: workspace.id,
                  }),
                { since: input.since, waitSeconds: input.waitSeconds },
              ),
            );
            return collectionChangesOutputSchema.parse(
              describeMcpChanges(dependencies.portalUrl, collection, people, answer, columns),
            );
          },
          formatChangesText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsRead],
};
