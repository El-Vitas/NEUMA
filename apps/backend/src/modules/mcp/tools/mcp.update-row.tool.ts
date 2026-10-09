import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { describeMcpRowAsSeen, openMcpRow } from '../lib/mcp.collections.lib';
import { normalizeMcpCellValues } from '../lib/mcp.columns.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { rowOutputSchema, updateRowInputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpCollectionShape,
  McpNameLister,
  McpRowOutput,
  McpUpdateRowInput,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type { McpCall, McpPerson, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

/** Las propiedades, y el título si viene, en una sola escritura: o quedan las dos cosas o ninguna. */
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

/**
 * Cambia lo que el agente pidió y nada más, en una sola escritura. Todo lo que
 * el agente escribió se revisa antes de escribir.
 */
const writeRowChanges = (
  dependencies: McpServerDependencies,
  call: McpCall,
  target: { readonly listNames: McpNameLister; readonly row: McpWrittenRow; readonly shape: McpCollectionShape },
  people: readonly McpPerson[],
  input: McpUpdateRowInput,
): Promise<McpWrittenRow> => {
  if (input.properties !== undefined) {
    const values = requireMcpInput(
      normalizeMcpCellValues(target.shape.properties, input.properties, people, target.listNames),
    );
    return writeProperties(dependencies, call, target.row, values, input.title);
  }
  if (input.title === undefined) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
  return renameRow(dependencies, call, target.row, input.title);
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

/**
 * Cambia una fila de una colección: su título o sus propiedades. Mover una
 * tarea a otra columna de un tablero es cambiar su estado.
 *
 * Solo viaja lo que se nombra; lo demás que la fila tenía se queda como estaba,
 * aunque otra persona lo haya cambiado mientras tanto.
 */
export const updateRowTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.updateRow,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.updateRow,
      {
        description:
          'Change a row of a collection: its title or some of its properties. Moving a task to another column of a board is changing its status here. Only the properties you name change; null empties one. Name columns, options and people as get_collection shows them.',
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
