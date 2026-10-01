import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { describeMcpRow, openMcpCollection } from '../lib/mcp.collections.lib';
import { keepFilledMcpCells, normalizeMcpCellValues } from '../lib/mcp.columns.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { buildMcpRowContent } from '../lib/mcp.row-content.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { createRowInputSchema, rowOutputSchema } from '../schemas/mcp.collections.schemas';
import type { McpCreateRowInput, McpOpenCollection, McpWrittenRow } from '../types/mcp.collections.types';
import type { McpCall, McpPerson, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

/** Crea la fila por el mismo servicio que usa el portal: las mismas validaciones y el mismo lugar en la colección. */
const createRow = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  people: readonly McpPerson[],
  input: McpCreateRowInput,
): Promise<McpWrittenRow> => {
  const { principal, workspace } = call;
  const values = requireMcpInput(normalizeMcpCellValues(collection.shape.properties, input.properties ?? {}, people));
  return requireMcpSuccess(
    await dependencies.rows.create(
      {
        content: buildMcpRowContent(input.text),
        createdById: principal.userId,
        parentId: collection.id,
        propertyValues: keepFilledMcpCells(values),
        role: principal.role,
        spaceId: collection.spaceId,
        title: input.title,
        userId: principal.userId,
        workspaceId: workspace.id,
      },
      principal.role,
    ),
  );
};

/**
 * Agrega una fila a una colección: una tarea nueva en un tablero, con su
 * estado, su responsable y su fecha.
 *
 * El agente nombra columnas, opciones y personas como las ve la gente; lo que
 * no calza se rechaza entero, diciendo qué sí vale, antes de escribir nada.
 */
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
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.createRow,
          async () => {
            const call = await openMcpCall(dependencies);
            const [collection, people] = await Promise.all([
              openMcpCollection(dependencies, call, input.collection, ACCESS_TOKEN_PERMISSIONS.collectionsWrite),
              dependencies.people.listAssignableMembers(call.workspace.id),
            ]);
            const request = {
              blockIds: [],
              detail: { columns: Object.keys(input.properties ?? {}), title: input.title },
              pageId: collection.id,
              tool: MCP_TOOL_NAMES.createRow,
            };
            const created = await recordMcpWrite(dependencies, call, request, () =>
              createRow(dependencies, call, collection, people, input),
            );
            return rowOutputSchema.parse(describeMcpRow(dependencies.portalUrl, collection.shape, created, people));
          },
          (output) => `Row created.\n${formatMcpRowText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite],
};
