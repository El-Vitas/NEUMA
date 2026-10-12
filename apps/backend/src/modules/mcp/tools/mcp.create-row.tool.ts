import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { describeMcpRowAsSeen, openMcpCollection, readMcpRowPlace } from '../lib/mcp.collections.lib';
import { keepFilledMcpCells, normalizeMcpCellValues } from '../lib/mcp.columns.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { buildMcpRowContent } from '../lib/mcp.row-content.lib';
import { createRowInputSchema, rowOutputSchema } from '../schemas/mcp.collections.schemas';
import type { McpCreateRowInput, McpOpenCollection, McpRowOutput, McpWrittenRow } from '../types/mcp.collections.types';
import type { McpCall, McpPerson, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const writeRow = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  people: readonly McpPerson[],
  input: McpCreateRowInput,
): Promise<McpWrittenRow> => {
  const { principal, workspace } = call;
  const values = requireMcpInput(
    normalizeMcpCellValues(collection.shape.properties, input.properties ?? {}, people, collection.listNames),
  );
  return requireMcpSuccess(
    await dependencies.rows.create({
      content: buildMcpRowContent(input.text),
      parentId: collection.id,
      propertyValues: keepFilledMcpCells(values),
      role: principal.role,
      spaceId: collection.spaceId,
      title: input.title,
      userId: principal.userId,
      workspaceId: workspace.id,
    }),
  );
};

const createRow = async (
  dependencies: McpServerDependencies,
  input: McpCreateRowInput,
  { call, record }: McpWriteSession,
): Promise<McpRowOutput> => {
  const [collection, people] = await Promise.all([
    openMcpCollection(dependencies, call, input.collection, ACCESS_TOKEN_PERMISSIONS.collectionsWrite),
    dependencies.people.listAssignableMembers(call.workspace.id),
  ]);
  const request = {
    blockIds: [],
    detail: { collectionId: collection.id, columns: Object.keys(input.properties ?? {}), title: input.title },
    pageId: collection.id,
    tool: MCP_TOOL_NAMES.createRow,
  };
  const created = await record(
    request,
    () => writeRow(dependencies, call, collection, people, input),
    (row) => row.id,
  );
  const seen = { place: readMcpRowPlace(collection, created.id), shape: collection.shape };
  return rowOutputSchema.parse(describeMcpRowAsSeen(dependencies.portalUrl, call, seen, created, people));
};

export const createRowTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.createRow,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.createRow,
      {
        description:
          'Add a row to a collection, such as a new task on a board, with its properties (status, assignee, due date…) and, if you want, some text for its page. Name columns, options and people as get_collection shows them. The title is its own field, not a property.',
        inputSchema: createRowInputSchema,
        outputSchema: rowOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.collection, tool: MCP_TOOL_NAMES.createRow },
          (session) => createRow(dependencies, input, session),
          (output) => `Row created.\n${formatMcpRowText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite],
};
