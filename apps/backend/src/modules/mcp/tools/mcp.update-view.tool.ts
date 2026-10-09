import type { Prisma } from '@company-brain/db/generated';
import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import {
  describeMcpCollectionAsSeen,
  openMcpCollectionWithPeople,
  readMcpColumnsInHand,
  requireMcpView,
  saveMcpCollectionShape,
} from '../lib/mcp.collections.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { buildMcpViewConfiguration } from '../lib/mcp.view-configuration.lib';
import { changeMcpView } from '../lib/mcp.views.lib';
import { collectionOutputSchema, updateViewInputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpCollectionOutput,
  McpOpenCollection,
  McpUpdateViewInput,
  McpView,
} from '../types/mcp.collections.types';
import type { McpCall, McpPerson, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const asksForAnyChange = (input: McpUpdateViewInput): boolean =>
  [input.groupBy, input.makeDefault, input.name, input.sort, input.visibleColumns, input.where].some(
    (change) => change !== undefined,
  );

/** Si solo cambia lo que la vista muestra: eso va por su camino propio, sin reescribir la colección entera. */
const changesOnlyWhatItShows = (input: McpUpdateViewInput): boolean =>
  input.name === undefined && input.makeDefault !== true;

/**
 * Cambia lo que una vista muestra por el camino que no toca las demás vistas
 * ni las columnas: guardar la colección entera por un filtro dejaría una
 * ventana donde se pierde lo que otra persona acaba de cambiar.
 */
const setViewConfiguration = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  view: McpView,
  configuration: Prisma.InputJsonObject,
): Promise<McpOpenCollection> => {
  const { principal, workspace } = call;
  const saved = requireMcpSuccess(
    await dependencies.collections.setViewConfiguration({
      configuration,
      pageId: collection.id,
      role: principal.role,
      userId: principal.userId,
      viewName: view.name,
      workspaceId: workspace.id,
    }),
  );
  return { ...collection, shape: { properties: saved.properties, views: saved.views } };
};

const changeView = (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  people: readonly McpPerson[],
  input: McpUpdateViewInput,
): Promise<McpOpenCollection> => {
  const { properties, views } = collection.shape;
  const view = requireMcpView(collection, input.view);
  const configuration = requireMcpInput(
    buildMcpViewConfiguration(readMcpColumnsInHand(collection), input, people, view.configuration),
  );
  if (changesOnlyWhatItShows(input)) return setViewConfiguration(dependencies, call, collection, view, configuration);
  const changed = requireMcpInput(
    changeMcpView(views, view, { configuration, makeDefault: input.makeDefault, name: input.name }),
  );
  return saveMcpCollectionShape(dependencies, call, collection, { properties, views: changed });
};

const updateView = async (
  dependencies: McpServerDependencies,
  input: McpUpdateViewInput,
  { call, record }: McpWriteSession,
): Promise<McpCollectionOutput> => {
  if (!asksForAnyChange(input)) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
  const [collection, people] = await openMcpCollectionWithPeople(
    dependencies,
    call,
    input.collection,
    ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
  );
  const request = {
    blockIds: [],
    detail: { name: input.name ?? null, view: input.view },
    pageId: collection.id,
    tool: MCP_TOOL_NAMES.updateView,
  };
  const saved = await record(request, () => changeView(dependencies, call, collection, people, input));
  return describeMcpCollectionAsSeen(dependencies.portalUrl, call, saved);
};

/**
 * Cambia una vista de una colección: su nombre, qué filtra, cómo ordena, por
 * qué agrupa, qué columnas muestra, o si es con la que se abre. Lo que no se
 * nombra queda como estaba.
 */
export const updateViewTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.updateView,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.updateView,
      {
        description:
          'Change a view of a collection: its name, what it filters, how it sorts, what it groups by, which columns it shows, or whether the collection opens with it. What you leave out stays as it was; where and sort given here replace the view’s own. Name the view, columns, options and people as get_collection shows them.',
        inputSchema: updateViewInputSchema,
        outputSchema: collectionOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.collection, tool: MCP_TOOL_NAMES.updateView },
          (session) => updateView(dependencies, input, session),
          (output) => `View updated.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
