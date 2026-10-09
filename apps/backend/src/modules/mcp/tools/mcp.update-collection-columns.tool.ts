import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES, MCP_UNEXPECTED_MESSAGE } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import {
  describeMcpCollectionAsSeen,
  openMcpCollection,
  readMcpColumnsInHand,
  saveMcpCollectionShape,
} from '../lib/mcp.collections.lib';
import {
  applyMcpColumnChanges,
  describeMcpColumnChanges,
  hasMcpColumnChanges,
  hasMcpShapeChanges,
} from '../lib/mcp.column-changes.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { collectionOutputSchema, updateCollectionColumnsInputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpCollectionOutput,
  McpColumnChanges,
  McpOpenCollection,
  McpOptionRewrite,
  McpUpdateCollectionColumnsInput,
} from '../types/mcp.collections.types';
import type { McpCall, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

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

const describeRewrite = (rewrite: McpOptionRewrite): string =>
  rewrite.to === null ? `removed "${rewrite.from}"` : `renamed "${rewrite.from}" to "${rewrite.to}"`;

/** Las opciones una tras otra: cada una parte de lo que dejó la anterior, y queda anotada al hacerse. */
const rewriteOptions = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  plan: { readonly done: string[]; readonly rewrites: readonly McpOptionRewrite[] },
): Promise<McpOpenCollection> => {
  let latest = collection;
  for (const rewrite of plan.rewrites) {
    latest = await rewriteOption(dependencies, call, latest, rewrite);
    plan.done.push(describeRewrite(rewrite));
  }
  return latest;
};

/**
 * Un fallo a mitad de camino, con lo que ya quedó hecho. Cada opción es su
 * propia escritura y ya reescribió sus filas: si el agente no sabe cuáles
 * quedaron, las repite o cree que nada cambió. Un fallo que no es del agente se
 * cuenta en el log antes de decírselo.
 */
const sayWhatWasAlreadyDone = (
  dependencies: McpServerDependencies,
  error: unknown,
  done: readonly string[],
): unknown => {
  if (done.length === 0) return error;
  if (!(error instanceof McpToolError))
    dependencies.observer.unexpected(error, `changing columns after some options were already rewritten`);
  const said = error instanceof McpToolError ? error.message : MCP_UNEXPECTED_MESSAGE;
  const reason = error instanceof McpToolError ? error.reason : undefined;
  return new McpToolError(`${said} Already done before it stopped: ${done.join(', ')}.`, reason);
};

/**
 * Hace los cambios de columnas que pidió el agente.
 *
 * Todo lo pedido se revisa junto, contra la forma final, antes de la primera
 * escritura. Las opciones que se renombran o se quitan van primero, porque
 * reescriben las filas que las tenían; después se guarda la forma final ya
 * revisada.
 */
const changeColumns = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  changes: McpColumnChanges,
): Promise<McpOpenCollection> => {
  const plan = requireMcpInput(applyMcpColumnChanges(readMcpColumnsInHand(collection), changes));
  const done: string[] = [];
  try {
    const rewritten = await rewriteOptions(dependencies, call, collection, { done, rewrites: plan.optionRewrites });
    if (!hasMcpShapeChanges(changes)) return rewritten;
    return await saveMcpCollectionShape(dependencies, call, rewritten, {
      properties: plan.properties,
      views: rewritten.shape.views,
    });
  } catch (error) {
    throw sayWhatWasAlreadyDone(dependencies, error, done);
  }
};

const updateColumns = async (
  dependencies: McpServerDependencies,
  input: McpUpdateCollectionColumnsInput,
  { call, record }: McpWriteSession,
): Promise<McpCollectionOutput> => {
  const { collection: address, ...changes } = input;
  if (!hasMcpColumnChanges(changes)) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
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
  const saved = await record(request, () => changeColumns(dependencies, call, collection, changes));
  return describeMcpCollectionAsSeen(dependencies.portalUrl, call, saved);
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
        runMcpWrite(
          dependencies,
          { target: input.collection, tool: MCP_TOOL_NAMES.updateCollectionColumns },
          (session) => updateColumns(dependencies, input, session),
          (output) => `Columns updated.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
