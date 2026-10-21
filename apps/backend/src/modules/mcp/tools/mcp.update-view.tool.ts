import type { JsonObject } from '@neuma/db';
import {
  ACCESS_TOKEN_PERMISSIONS,
  diffPageViewConfigurations,
  readPageViewConfiguration,
  toPageViewEnvelope,
} from '@neuma/shared';
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
import type {
  McpAssignablePerson,
  McpCall,
  McpServerDependencies,
  McpToolDefinition,
  McpWriteSession,
} from '../types/mcp.types';

const asksForAnyChange = (input: McpUpdateViewInput): boolean =>
  [input.groupBy, input.makeDefault, input.name, input.sort, input.visibleColumns, input.where].some(
    (change) => change !== undefined,
  );

const changesOnlyWhatItShows = (input: McpUpdateViewInput): boolean =>
  input.name === undefined && input.makeDefault !== true;

/**
 * Only what changed is sent, as operations on the view: saving the whole collection or the whole configuration for
 * a filter would overwrite what someone else changed meanwhile.
 */
const applyViewChanges = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  view: McpView,
  configuration: JsonObject,
): Promise<McpOpenCollection> => {
  const { principal, workspace } = call;
  if (view.id === undefined) throw new McpToolError(`The view "${view.name}" was not saved yet.`);
  const viewId = view.id;
  const operations = diffPageViewConfigurations(
    readPageViewConfiguration(view.configuration),
    readPageViewConfiguration(configuration),
  ).map((operation) => {
    const { args, command, path } = toPageViewEnvelope(viewId, operation);
    return { args, command, path: [...path] };
  });
  if (operations.length === 0) return collection;
  const changed = requireMcpSuccess(
    await dependencies.collections.applyViewOperations({
      operations,
      pageId: collection.id,
      role: principal.role,
      userId: principal.userId,
      viewId,
      workspaceId: workspace.id,
    }),
  );
  const views = collection.shape.views.map((candidate) =>
    candidate.id === changed.id ? { ...candidate, configuration: changed.configuration } : candidate,
  );
  return { ...collection, shape: { properties: collection.shape.properties, views } };
};

const changeView = (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  people: readonly McpAssignablePerson[],
  input: McpUpdateViewInput,
): Promise<McpOpenCollection> => {
  const { properties, views } = collection.shape;
  const view = requireMcpView(collection, input.view);
  const configuration = requireMcpInput(
    buildMcpViewConfiguration(readMcpColumnsInHand(collection), input, people, view.configuration),
  );
  if (changesOnlyWhatItShows(input)) return applyViewChanges(dependencies, call, collection, view, configuration);
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
