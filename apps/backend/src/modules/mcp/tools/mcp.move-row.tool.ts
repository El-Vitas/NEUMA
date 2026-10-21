import type { PagePropertyValues } from '@neuma/shared';
import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import {
  MCP_MOVE_NEEDS_A_PLACE_MESSAGE,
  MCP_MOVE_NO_RELATIONS_MESSAGE,
  MCP_MOVE_ONE_NEIGHBOUR_MESSAGE,
} from '../constants/mcp.query.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { describeMcpRowAsSeen, openMcpRow } from '../lib/mcp.collections.lib';
import { keepFilledMcpCells, normalizeMcpCellValues, readMcpRelationRequests } from '../lib/mcp.columns.lib';
import { readMcpPageId, requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { pickMcpView } from '../lib/mcp.views.lib';
import { moveRowInputSchema, rowOutputSchema } from '../schemas/mcp.collections.schemas';
import type { McpCellValue, McpMoveRowInput, McpRowOutput } from '../types/mcp.collections.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

/** What the row holds after the values are written: null empties a cell, the rest replaces it. */
const mergeValues = (
  held: PagePropertyValues | null,
  written: Readonly<Record<string, McpCellValue>>,
): PagePropertyValues => {
  const emptied = new Set(Object.entries(written).flatMap(([key, value]) => (value === null ? [key] : [])));
  const kept = Object.entries(held ?? {}).filter(([key]) => !emptied.has(key));
  return { ...Object.fromEntries(kept), ...keepFilledMcpCells(written) };
};

const refuseUnsayablePlace = (input: McpMoveRowInput): void => {
  if (input.before !== undefined && input.after !== undefined) throw new McpToolError(MCP_MOVE_ONE_NEIGHBOUR_MESSAGE);
  const hasPlace = input.before !== undefined || input.after !== undefined;
  if (!hasPlace && input.properties === undefined) throw new McpToolError(MCP_MOVE_NEEDS_A_PLACE_MESSAGE);
  if (!hasPlace && Object.keys(input.properties ?? {}).length === 0)
    throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
};

const moveRow = async (
  dependencies: McpServerDependencies,
  input: McpMoveRowInput,
  { call, record }: McpWriteSession,
): Promise<McpRowOutput> => {
  refuseUnsayablePlace(input);
  const [target, people] = await Promise.all([
    openMcpRow(dependencies, call, input.row, ACCESS_TOKEN_PERMISSIONS.collectionsWrite),
    dependencies.people.listAssignableMembers(call.workspace.id),
  ]);
  const { listNames, row, shape } = target;
  if (row.parentId === null) throw new McpToolError(MCP_MOVE_NEEDS_A_PLACE_MESSAGE);
  const view = requireMcpInput(pickMcpView(shape.views, input.view, listNames));
  if (view.id === undefined) throw new McpToolError(`The view "${view.name}" was not saved yet.`);
  const properties = input.properties ?? {};
  const requests = requireMcpInput(readMcpRelationRequests(shape.properties, properties, listNames));
  if (requests.length > 0) throw new McpToolError(MCP_MOVE_NO_RELATIONS_MESSAGE);
  const values = requireMcpInput(normalizeMcpCellValues(shape.properties, properties, people, listNames));
  const { principal, workspace } = call;
  const request = {
    blockIds: [],
    detail: { columns: Object.keys(properties), view: view.name },
    pageId: row.id,
    tool: MCP_TOOL_NAMES.moveRow,
  };
  await record(request, async () =>
    requireMcpSuccess(
      await dependencies.collections.moveRow({
        ...(input.after === undefined ? {} : { after: readMcpPageId(input.after) }),
        ...(input.before === undefined ? {} : { before: readMcpPageId(input.before) }),
        pageId: row.parentId ?? '',
        role: principal.role,
        rowId: row.id,
        userId: principal.userId,
        values,
        viewId: view.id ?? '',
        workspaceId: workspace.id,
      }),
    ),
  );
  const moved = {
    id: row.id,
    propertyValues: mergeValues(row.propertyValues, values),
    spaceId: row.spaceId,
    title: row.title,
  };
  return rowOutputSchema.parse(describeMcpRowAsSeen(dependencies.portalUrl, call, target, moved, people));
};

/** The values and the place go in one write, so a card is never half moved. */
export const moveRowTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.moveRow,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.moveRow,
      {
        description:
          'Move a row of a collection the way a card moves on a board: it takes the values of where it lands (the status of the column, the owner of the band) and takes its place in the order of a view, right before or right after another row, in one write. Each view keeps its own order, so name the view. Give only before or after; leave both out to change the values without changing the place. Name columns, options and people as get_collection shows them.',
        inputSchema: moveRowInputSchema,
        outputSchema: rowOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.row, tool: MCP_TOOL_NAMES.moveRow },
          (session) => moveRow(dependencies, input, session),
          (output) => `Row moved.\n${formatMcpRowText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite],
};
