import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { describeMcpRow, openMcpRow } from '../lib/mcp.collections.lib';
import { normalizeMcpCellValues } from '../lib/mcp.columns.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { rowOutputSchema, updateRowInputSchema } from '../schemas/mcp.collections.schemas';
import type { McpCollectionShape, McpUpdateRowInput, McpWrittenRow } from '../types/mcp.collections.types';
import type { McpCall, McpPerson, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

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
  target: { readonly row: McpWrittenRow; readonly shape: McpCollectionShape },
  people: readonly McpPerson[],
  input: McpUpdateRowInput,
): Promise<McpWrittenRow> => {
  if (input.properties === undefined) return renameRow(dependencies, call, target.row, input.title ?? target.row.title);
  const values = requireMcpInput(normalizeMcpCellValues(target.shape.properties, input.properties, people));
  return writeProperties(dependencies, call, target.row, values, input.title);
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
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.updateRow,
          async () => {
            if (input.title === undefined && input.properties === undefined)
              throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
            const call = await openMcpCall(dependencies);
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
            const written = await recordMcpWrite(dependencies, call, request, () =>
              writeRowChanges(dependencies, call, target, people, input),
            );
            return rowOutputSchema.parse(describeMcpRow(dependencies.portalUrl, target.shape, written, people));
          },
          (output) => `Row updated.\n${formatMcpRowText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite],
};
