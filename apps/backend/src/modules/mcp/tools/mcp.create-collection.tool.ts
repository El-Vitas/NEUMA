import {
  ACCESS_TOKEN_PERMISSIONS,
  PAGE_COLLECTION_TITLE_PROPERTY_KEY,
  PAGE_PROPERTY_TYPE,
  PAGE_VIEW_TYPE,
} from '@company-brain/shared';
import { MCP_EMPTY_PAGE_CONTENT, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { describeMcpCollection, formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import { applyMcpColumnChanges } from '../lib/mcp.column-changes.lib';
import { requireMcpInput, requireMcpSuccess, resolveMcpCreationPlace } from '../lib/mcp.page-access.lib';
import { openMcpCall, readMcpPlace, runMcpTool } from '../lib/mcp.tool.lib';
import { collectionOutputSchema, createCollectionInputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpCollectionShape,
  McpColumn,
  McpCreateCollectionInput,
  McpOpenCollection,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type { McpCall, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

/** La columna que nombra cada fila, que toda colección tiene y que no se puede quitar. */
const writeTitleColumn = (name: string): McpColumn => ({
  key: PAGE_COLLECTION_TITLE_PROPERTY_KEY,
  label: name,
  options: null,
  required: true,
  type: PAGE_PROPERTY_TYPE.TITLE,
});

/** La forma con que nace la colección: sus columnas y una tabla sin filtros. Se revisa antes de crear nada. */
const planShape = (input: McpCreateCollectionInput): McpCollectionShape => {
  const plan = requireMcpInput(
    applyMcpColumnChanges([writeTitleColumn(input.titleColumn)], { addColumns: input.columns ?? [] }),
  );
  const table = { configuration: {}, isDefault: true, name: input.viewName, type: PAGE_VIEW_TYPE.TABLE };
  return { properties: plan.properties, views: [table] };
};

const createPage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  place: { readonly parentId: string | null; readonly spaceId: string },
  title: string,
): Promise<McpWrittenRow> => {
  const { principal, workspace } = call;
  return requireMcpSuccess(
    await dependencies.rows.create(
      {
        content: MCP_EMPTY_PAGE_CONTENT,
        createdById: principal.userId,
        parentId: place.parentId,
        propertyValues: null,
        role: principal.role,
        spaceId: place.spaceId,
        title,
        userId: principal.userId,
        workspaceId: workspace.id,
      },
      principal.role,
    ),
  );
};

/**
 * Le da a la página recién creada su forma de colección. La forma ya se revisó,
 * así que solo un fallo por dentro la deja sin columnas: entonces se cuenta
 * entero, nombrando la página, y el agente sabe qué quedó y dónde.
 */
const giveItsShape = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpWrittenRow,
  shape: McpCollectionShape,
): Promise<McpOpenCollection> => {
  const { principal, workspace } = call;
  try {
    const saved = requireMcpSuccess(
      await dependencies.collections.defineSchema({
        pageId: page.id,
        properties: shape.properties,
        role: principal.role,
        userId: principal.userId,
        views: shape.views,
        workspaceId: workspace.id,
      }),
    );
    const place = await readMcpPlace(dependencies, page.id, workspace.id);
    return { id: page.id, place, shape: saved, spaceId: page.spaceId, title: page.title };
  } catch (error) {
    dependencies.observer.unexpected(error, `create_collection left page ${page.id} without its columns`);
    const url = buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, null);
    throw new McpToolError(
      `The page ${url} was created, but its columns could not be set. Tell the person, so they can finish it or remove it.`,
    );
  }
};

/**
 * Crea una colección: una página cuyas páginas hijas son filas con columnas,
 * como un tablero de tareas. Nace con la columna que nombra cada fila, las que
 * pida el agente y una tabla.
 */
export const createCollectionTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.createCollection,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.createCollection,
      {
        description:
          'Create a new collection (a table or board of rows with columns, such as a task tracker) under a page or at the top of a space, with its columns and a first table view. Name the columns and the view in the language of the people who use it. To show it inside a page afterwards, insert a collection block there.',
        inputSchema: createCollectionInputSchema,
        outputSchema: collectionOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.createCollection,
          async () => {
            const call = await openMcpCall(dependencies);
            const place = await resolveMcpCreationPlace(dependencies, call, input, [
              ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
            ]);
            const shape = planShape(input);
            const request = {
              blockIds: [],
              detail: { title: input.title },
              pageId: place.parentId,
              tool: MCP_TOOL_NAMES.createCollection,
            };
            const collection = await recordMcpWrite(dependencies, call, request, async () =>
              giveItsShape(dependencies, call, await createPage(dependencies, call, place, input.title), shape),
            );
            return describeMcpCollection(dependencies.portalUrl, collection);
          },
          (output) => `Collection created.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
