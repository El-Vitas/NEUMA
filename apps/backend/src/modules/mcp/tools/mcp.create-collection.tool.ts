import {
  ACCESS_TOKEN_PERMISSIONS,
  PAGE_COLLECTION_TITLE_PROPERTY_KEY,
  PAGE_PROPERTY_TYPE,
  PAGE_VIEW_TYPE,
} from '@neuma/shared';
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

const writeTitleColumn = (name: string): McpColumn => ({
  key: PAGE_COLLECTION_TITLE_PROPERTY_KEY,
  label: name,
  options: null,
  required: true,
  type: PAGE_PROPERTY_TYPE.TITLE,
});

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
 * Uses the creation location instead of re-reading it: an extra read after writing
 * could only fail and undo a good collection.
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
 * A column-less collection is worse than none, so the page is undone. If undo fails,
 * the result names the remaining page so a person can finish or remove it.
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

/** The shape is already validated, so only an internal failure leaves the page column-less. */
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
