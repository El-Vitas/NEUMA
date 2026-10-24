import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { describeMcpRowAsSeen, openMcpRow } from '../lib/mcp.collections.lib';
import { normalizeMcpCellValues, readMcpRelationRequests } from '../lib/mcp.columns.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { applyMcpRowRelations, planMcpRowRelations, withLinkedRows } from '../lib/mcp.relations.lib';
import { rowOutputSchema, updateRowInputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpCollectionShape,
  McpNameLister,
  McpRowOutput,
  McpUpdateRowInput,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type {
  McpAssignablePerson,
  McpCall,
  McpServerDependencies,
  McpToolDefinition,
  McpWriteSession,
} from '../types/mcp.types';

/** Properties and the title go in one write: both apply or neither. */
const writeProperties = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  row: McpWrittenRow,
  values: Readonly<Record<string, unknown>>,
  title: string | undefined,
): Promise<McpWrittenRow> => {
  const { principal, workspace } = call;
  return requireMcpSuccess(
    await dependencies.rows.updateProperties({
      pageId: row.id,
      propertyValues: values,
      role: principal.role,
      ...(title === undefined ? {} : { title }),
      updatedById: principal.userId,
      userId: principal.userId,
      workspaceId: workspace.id,
    }),
  );
};

const renameRow = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  row: McpWrittenRow,
  title: string,
): Promise<McpWrittenRow> => {
  const { principal, workspace } = call;
  return requireMcpSuccess(
    await dependencies.rows.rename(row.id, title, principal.userId, workspace.id, principal.role),
  );
};

/** Links go first and all at once: if one is refused nothing else was written, so the row is as it was. */
const writeRowChanges = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  target: { readonly listNames: McpNameLister; readonly row: McpWrittenRow; readonly shape: McpCollectionShape },
  people: readonly McpAssignablePerson[],
  input: McpUpdateRowInput,
): Promise<McpWrittenRow> => {
  if (input.properties === undefined) {
    if (input.title === undefined) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
    return renameRow(dependencies, call, target.row, input.title);
  }
  const { listNames, row, shape } = target;
  const values = requireMcpInput(normalizeMcpCellValues(shape.properties, input.properties, people, listNames));
  const requests = requireMcpInput(readMcpRelationRequests(shape.properties, input.properties, listNames));
  const changes = await planMcpRowRelations(dependencies, call, requests, row.propertyValues);
  await applyMcpRowRelations(dependencies, call, row, changes);
  const hasOtherChanges = Object.keys(values).length > 0 || input.title !== undefined;
  if (!hasOtherChanges) return withLinkedRows(row, changes);
  return withLinkedRows(await writeProperties(dependencies, call, row, values, input.title), changes);
};

const updateRow = async (
  dependencies: McpServerDependencies,
  input: McpUpdateRowInput,
  { call, record }: McpWriteSession,
): Promise<McpRowOutput> => {
  const [target, people] = await Promise.all([
    openMcpRow(dependencies, call, input.row, ACCESS_TOKEN_PERMISSIONS.collectionsWrite),
    dependencies.people.listAssignableMembers(call.workspace.id),
  ]);
  const request = {
    blockIds: [],
    detail: { columns: Object.keys(input.properties ?? {}), title: input.title ?? null },
    pageId: target.row.id,
    tool: MCP_TOOL_NAMES.updateRow,
  };
  const written = await record(request, () => writeRowChanges(dependencies, call, target, people, input));
  return rowOutputSchema.parse(describeMcpRowAsSeen(dependencies.portalUrl, call, target, written, people));
};

/** Only named values are sent, so concurrent edits to other values survive. */
export const updateRowTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.updateRow,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.updateRow,
      {
        description:
          'Change a row of a collection: its title or some of its properties. Moving a task to another column of a board is changing its status here. Only the properties you name change; null empties one (a status cannot be emptied). Name columns and options as get_collection shows them (an option may also be given by its id). The properties field says what each column type takes: people by name, email or id, dates and ranges, percents, links, emails, phones, file ids, and relations, whose rows you link and unlink with { add, remove } by page id or title, or replace with a list. Links are applied first and all together: if one is refused (for instance the token cannot edit the row on the other side of a two-way relation) nothing is changed.',
        inputSchema: updateRowInputSchema,
        outputSchema: rowOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.row, tool: MCP_TOOL_NAMES.updateRow },
          (session) => updateRow(dependencies, input, session),
          (output) => `Row updated.\n${formatMcpRowText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite],
};
