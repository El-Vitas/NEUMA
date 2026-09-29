import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { describeMcpCollection, formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import {
  openMcpCollection,
  requireMcpInput,
  requireMcpSuccess,
  saveMcpCollectionShape,
} from '../lib/mcp.collections.lib';
import {
  applyMcpColumnChanges,
  describeMcpColumnChanges,
  hasMcpColumnChanges,
  hasMcpShapeChanges,
  withoutMcpOptionRewrites,
} from '../lib/mcp.column-changes.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { collectionOutputSchema, updateCollectionColumnsInputSchema } from '../schemas/mcp.collections.schemas';
import type { McpColumnChanges, McpOpenCollection, McpOptionRewrite } from '../types/mcp.collections.types';
import type { McpCall, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

/** Renombra o quita una opción y reescribe en el mismo movimiento las filas que la tenían. */
const rewriteOption = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  rewrite: McpOptionRewrite,
): Promise<McpOpenCollection> => {
  const { principal, workspace } = call;
  const saved = requireMcpSuccess(
    await dependencies.collections.rewriteOption({
      ...rewrite,
      pageId: collection.id,
      role: principal.role,
      userId: principal.userId,
      workspaceId: workspace.id,
    }),
  );
  return { ...collection, shape: { properties: saved.properties, views: saved.views } };
};

/** Las opciones una tras otra: cada una parte de lo que dejó la anterior. */
const rewriteOptions = (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  rewrites: readonly McpOptionRewrite[],
): Promise<McpOpenCollection> =>
  rewrites.reduce(
    async (latest, rewrite) => rewriteOption(dependencies, call, await latest, rewrite),
    Promise.resolve(collection),
  );

/**
 * Hace los cambios de columnas que pidió el agente.
 *
 * Todo lo pedido se revisa contra la colección antes de la primera escritura.
 * Las opciones que se renombran o se quitan van primero, porque reescriben las
 * filas que las tenían; el resto se aplica después sobre la forma que dejaron,
 * así guardarla no devuelve los nombres viejos.
 */
const updateColumns = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  changes: McpColumnChanges,
): Promise<McpOpenCollection> => {
  const plan = requireMcpInput(applyMcpColumnChanges(collection.shape.properties, changes));
  const rewritten = await rewriteOptions(dependencies, call, collection, plan.optionRewrites);
  if (!hasMcpShapeChanges(changes)) return rewritten;
  const reshaped = requireMcpInput(
    applyMcpColumnChanges(rewritten.shape.properties, withoutMcpOptionRewrites(changes)),
  );
  return saveMcpCollectionShape(dependencies, call, rewritten, {
    properties: reshaped.properties,
    views: rewritten.shape.views,
  });
};

/**
 * Cambia las columnas de una colección: agrega, renombra o quita columnas, y
 * agrega, renombra o quita las opciones de una columna de selección.
 *
 * Renombrar una columna o una opción conserva lo que las filas tenían en ella.
 */
export const updateCollectionColumnsTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.updateCollectionColumns,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.updateCollectionColumns,
      {
        description:
          'Change the columns of a collection: add, rename or remove columns, and add, rename or remove the options of a select column (the columns of a board grouped by it). Renaming keeps what the rows had; removing an option leaves the rows that had it empty in that column. Name columns and options as get_collection shows them.',
        inputSchema: updateCollectionColumnsInputSchema,
        outputSchema: collectionOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          async () => {
            const { collection: address, ...changes } = input;
            if (!hasMcpColumnChanges(changes)) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
            const call = await openMcpCall(dependencies);
            const collection = await openMcpCollection(
              dependencies,
              call,
              address,
              ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
            );
            const request = {
              blockIds: [],
              detail: describeMcpColumnChanges(changes),
              pageId: collection.id,
              tool: MCP_TOOL_NAMES.updateCollectionColumns,
            };
            const saved = await recordMcpWrite(dependencies, call, request, () =>
              updateColumns(dependencies, call, collection, changes),
            );
            return describeMcpCollection(dependencies.portalUrl, saved);
          },
          (output) => `Columns updated.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
