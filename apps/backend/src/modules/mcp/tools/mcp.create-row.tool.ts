import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { formatMcpRowText } from '../lib/mcp.collection-output.lib';
import { describeMcpRowAsSeen, openMcpCollection, readMcpRowPlace } from '../lib/mcp.collections.lib';
import { keepFilledMcpCells, normalizeMcpCellValues, readMcpRelationRequests } from '../lib/mcp.columns.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { applyMcpRowRelations, planMcpRowRelations, withLinkedRows } from '../lib/mcp.relations.lib';
import { buildMcpRowContent } from '../lib/mcp.row-content.lib';
import { pickMcpTemplate } from '../lib/mcp.templates.lib';
import { readMcpActor } from '../lib/mcp.tool.lib';
import { createRowInputSchema, rowOutputSchema } from '../schemas/mcp.collections.schemas';
import type {
  McpCreateRowInput,
  McpOpenCollection,
  McpRelationChange,
  McpRowOutput,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type {
  McpAssignablePerson,
  McpCall,
  McpServerDependencies,
  McpToolDefinition,
  McpWriteSession,
} from '../types/mcp.types';

/** Undefined takes the default template, null asks for none, and a name or an id is looked up among the templates. */
const readTemplateId = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  template: null | string | undefined,
): Promise<null | string | undefined> => {
  if (template === undefined || template === null) return template;
  const stored = requireMcpSuccess(
    await dependencies.templates.list({ ...readMcpActor(call), collectionId: collection.id }),
  );
  return requireMcpInput(pickMcpTemplate(stored.templates, template, collection.listNames)).id;
};

const writeRow = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  people: readonly McpAssignablePerson[],
  input: McpCreateRowInput,
): Promise<McpWrittenRow> => {
  const { principal, workspace } = call;
  const { listNames, shape } = collection;
  const values = requireMcpInput(normalizeMcpCellValues(shape.properties, input.properties ?? {}, people, listNames));
  const requests = requireMcpInput(readMcpRelationRequests(shape.properties, input.properties ?? {}, listNames));
  const changes = await planMcpRowRelations(dependencies, call, requests, null);
  const templateId = await readTemplateId(dependencies, call, collection, input.template);
  const created = requireMcpSuccess(
    await dependencies.rows.create({
      content: buildMcpRowContent(input.text),
      parentId: collection.id,
      propertyValues: keepFilledMcpCells(values),
      role: principal.role,
      spaceId: collection.spaceId,
      ...(templateId === undefined ? {} : { templateId }),
      ...(input.timeZone === undefined ? {} : { timeZone: input.timeZone }),
      title: input.title,
      userId: principal.userId,
      workspaceId: workspace.id,
    }),
  );
  await linkOrTakeBack(dependencies, call, created, changes);
  return withLinkedRows(created, changes);
};

/** A row that could not be linked is sent to the trash again, so a refused call leaves no half-made row behind. */
const linkOrTakeBack = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  row: McpWrittenRow,
  changes: readonly McpRelationChange[],
): Promise<void> => {
  try {
    await applyMcpRowRelations(dependencies, call, row, changes);
  } catch (error) {
    const { principal, workspace } = call;
    await dependencies.pages.trash({
      pageId: row.id,
      role: principal.role,
      userId: principal.userId,
      workspaceId: workspace.id,
    });
    throw error;
  }
};

const createRow = async (
  dependencies: McpServerDependencies,
  input: McpCreateRowInput,
  { call, record }: McpWriteSession,
): Promise<McpRowOutput> => {
  const [collection, people] = await Promise.all([
    openMcpCollection(dependencies, call, input.collection, ACCESS_TOKEN_PERMISSIONS.collectionsWrite),
    dependencies.people.listAssignableMembers(call.workspace.id),
  ]);
  const request = {
    blockIds: [],
    detail: { collectionId: collection.id, columns: Object.keys(input.properties ?? {}), title: input.title },
    pageId: collection.id,
    tool: MCP_TOOL_NAMES.createRow,
  };
  const created = await record(
    request,
    () => writeRow(dependencies, call, collection, people, input),
    (row) => row.id,
  );
  const seen = { place: readMcpRowPlace(collection, created.id), shape: collection.shape };
  return rowOutputSchema.parse(describeMcpRowAsSeen(dependencies.portalUrl, call, seen, created, people));
};

export const createRowTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.createRow,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.createRow,
      {
        description:
          'Add a row to a collection, such as a new task on a board, with its properties and, if you want, some text for its page. The title is its own field, not a property. Name columns and options as get_collection shows them (an option may also be given by its id). The properties field says what each column type takes: status and select by option, people by name, email or id, dates and ranges, percents, links, emails, phones, file ids, and relations, which link rows of another collection by page id or title in the same call. A status starts on its first "to do" option when you give none; a unique id, creation and edition columns are filled in by Neuma. If the collection has templates (list_templates), the row copies the default one unless you name another in template (its name or id) or pass template null for a blank row: the template gives the text of the row page and its values, writes today\'s date in the date columns it marks "@today" (in your timeZone, UTC when left out) and you in the person columns it marks "@me"; whatever you give in properties and text wins over it, and a row title is always yours. If a relation cannot be linked (for instance the token cannot edit the row on the other side of a two-way relation) nothing is created.',
        inputSchema: createRowInputSchema,
        outputSchema: rowOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.collection, tool: MCP_TOOL_NAMES.createRow },
          (session) => createRow(dependencies, input, session),
          (output) => `Row created.\n${formatMcpRowText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite],
};
