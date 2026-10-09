import {
  ACCESS_TOKEN_PERMISSIONS,
  PAGE_COLLECTION_TITLE_PROPERTY_KEY,
  PAGE_PROPERTY_TYPE,
  PAGE_VIEW_TYPE,
} from '@company-brain/shared';
import { MCP_EMPTY_PAGE_CONTENT, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { describeMcpCollection, formatMcpCollectionText } from '../lib/mcp.collection-output.lib';
import { requireMcpRowChangeAllowed } from '../lib/mcp.collections.lib';
import { applyMcpColumnChanges } from '../lib/mcp.column-changes.lib';
import { listMcpNames } from '../lib/mcp.columns.lib';
import { requireMcpInput, requireMcpSuccess, resolveMcpCreationPlace } from '../lib/mcp.page-access.lib';
import { readMcpActor } from '../lib/mcp.tool.lib';
import { collectionOutputSchema, createCollectionInputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpCollectionOutput,
  McpCollectionShape,
  McpColumn,
  McpCreateCollectionInput,
  McpOpenCollection,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type {
  McpCall,
  McpCreationPlace,
  McpServerDependencies,
  McpToolDefinition,
  McpWriteSession,
} from '../types/mcp.types';

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
    applyMcpColumnChanges(
      { columns: [writeTitleColumn(input.titleColumn)], listNames: listMcpNames },
      { addColumns: input.columns ?? [] },
    ),
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
    await dependencies.rows.create({
      content: MCP_EMPTY_PAGE_CONTENT,
      parentId: place.parentId,
      propertyValues: null,
      role: principal.role,
      spaceId: place.spaceId,
      title,
      userId: principal.userId,
      workspaceId: workspace.id,
    }),
  );
};

/**
 * Guarda la forma de la página recién creada. Su lugar sale de donde se creó,
 * sin volver a preguntarlo: una lectura de más después de escribir solo podría
 * fallar y deshacer una colección que quedó bien.
 */
const saveShape = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  created: { readonly page: McpWrittenRow; readonly where: McpCreationPlace },
  shape: McpCollectionShape,
): Promise<McpOpenCollection> => {
  const { principal, workspace } = call;
  const { page, where } = created;
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
  const place = { lineage: [page.id, ...where.parentPlace.lineage], spaceId: where.spaceId };
  return { id: page.id, listNames: listMcpNames, place, shape: saved, spaceId: page.spaceId, title: page.title };
};

/**
 * Deshace la página que esta misma llamada acaba de crear, cuando no se le
 * pudo dar su forma: una colección a medias, sin columnas, confunde más de lo
 * que sirve. Si no se puede deshacer, se dice cuál quedó para que una persona
 * la termine o la quite.
 */
const trashPage = async (dependencies: McpServerDependencies, call: McpCall, page: McpWrittenRow): Promise<boolean> => {
  try {
    const trashed = await dependencies.pages.trash({ ...readMcpActor(call), pageId: page.id });
    return trashed.isOk();
  } catch (error) {
    dependencies.observer.unexpected(error, `taking back page ${page.id} that create_collection left without columns`);
    return false;
  }
};

const takeBackPage = async (dependencies: McpServerDependencies, call: McpCall, page: McpWrittenRow): Promise<void> => {
  if (await trashPage(dependencies, call, page)) return;
  const url = buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, null);
  throw new McpToolError(
    `The page ${url} was created, but its columns could not be set. Tell the person, so they can finish it or remove it.`,
  );
};

/**
 * Le da a la página recién creada su forma de colección. La forma ya se revisó,
 * así que solo un fallo por dentro la deja sin columnas: entonces la página se
 * deshace y el motivo sigue su camino.
 */
const giveItsShape = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  created: { readonly page: McpWrittenRow; readonly where: McpCreationPlace },
  shape: McpCollectionShape,
): Promise<McpOpenCollection> => {
  try {
    return await saveShape(dependencies, call, created, shape);
  } catch (error) {
    await takeBackPage(dependencies, call, created.page);
    throw error;
  }
};

const createCollection = async (
  dependencies: McpServerDependencies,
  input: McpCreateCollectionInput,
  { call, record }: McpWriteSession,
): Promise<McpCollectionOutput> => {
  const place = await resolveMcpCreationPlace(dependencies, call, input, [
    ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
  ]);
  await requireMcpRowChangeAllowed(dependencies, call, { parentId: place.parentId, place: place.parentPlace });
  const shape = planShape(input);
  const request = {
    blockIds: [],
    detail: { parentId: place.parentId, spaceId: place.spaceId, title: input.title },
    pageId: place.parentId,
    tool: MCP_TOOL_NAMES.createCollection,
  };
  const collection = await record(
    request,
    async () =>
      giveItsShape(
        dependencies,
        call,
        { page: await createPage(dependencies, call, place, input.title), where: place },
        shape,
      ),
    (created) => created.id,
  );
  return describeMcpCollection(dependencies.portalUrl, collection);
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
        runMcpWrite(
          dependencies,
          {
            requestId: input.requestId,
            target: input.parent ?? input.space ?? null,
            tool: MCP_TOOL_NAMES.createCollection,
          },
          (session) => createCollection(dependencies, input, session),
          (output) => `Collection created.\n${formatMcpCollectionText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
