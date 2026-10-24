import { ACCESS_TOKEN_PERMISSIONS, type PageTemplateVariables } from '@neuma/shared';
import { MCP_TEMPLATE_TITLE_NEEDED_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpCollectionWithPeople } from '../lib/mcp.collections.lib';
import { keepFilledMcpCells, normalizeMcpCellValues } from '../lib/mcp.columns.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { buildMcpRowContent } from '../lib/mcp.row-content.lib';
import {
  describeMcpTemplate,
  formatMcpTemplateText,
  pickMcpTemplate,
  readMcpTemplateVariables,
} from '../lib/mcp.templates.lib';
import { readMcpActor } from '../lib/mcp.tool.lib';
import { saveTemplateInputSchema, templateOutputSchema } from '../schemas/mcp.templates.schemas';
import type { McpOpenCollection } from '../types/mcp.collections.types';
import type {
  McpSaveTemplateInput,
  McpStoredTemplate,
  McpTemplateChange,
  McpTemplateOutput,
} from '../types/mcp.templates.types';
import type {
  McpAssignablePerson,
  McpServerDependencies,
  McpToolDefinition,
  McpWriteSession,
} from '../types/mcp.types';

const readChange = (
  collection: McpOpenCollection,
  people: readonly McpAssignablePerson[],
  input: McpSaveTemplateInput,
): McpTemplateChange => {
  const variables: PageTemplateVariables | undefined =
    input.variables === undefined ? undefined : requireMcpInput(readMcpTemplateVariables(collection, input.variables));
  const values =
    input.properties === undefined
      ? undefined
      : keepFilledMcpCells(
          requireMcpInput(
            normalizeMcpCellValues(collection.shape.properties, input.properties, people, collection.listNames),
          ),
        );
  return {
    ...(input.text === undefined ? {} : { content: buildMcpRowContent(input.text) }),
    ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
    ...(values === undefined ? {} : { propertyValues: values }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(variables === undefined ? {} : { variables }),
  };
};

const writeTemplate = async (
  dependencies: McpServerDependencies,
  collection: McpOpenCollection,
  people: readonly McpAssignablePerson[],
  input: McpSaveTemplateInput,
  { call, record }: McpWriteSession,
): Promise<McpStoredTemplate> => {
  const actor = readMcpActor(call);
  const change = readChange(collection, people, input);
  const request = {
    blockIds: [],
    detail: { collectionId: collection.id, template: input.template ?? null, title: input.title ?? null },
    pageId: collection.id,
    tool: MCP_TOOL_NAMES.saveTemplate,
  };
  if (input.template === undefined) {
    if (input.title === undefined) throw new McpToolError(MCP_TEMPLATE_TITLE_NEEDED_MESSAGE);
    return record(
      request,
      async () =>
        requireMcpSuccess(await dependencies.templates.create({ ...actor, change, collectionId: collection.id })),
      (created) => created.id,
    );
  }
  const stored = requireMcpSuccess(await dependencies.templates.list({ ...actor, collectionId: collection.id }));
  const template = requireMcpInput(pickMcpTemplate(stored.templates, input.template, collection.listNames));
  return record(request, async () =>
    requireMcpSuccess(
      await dependencies.templates.update({ ...actor, change, collectionId: collection.id, templateId: template.id }),
    ),
  );
};

const saveTemplate = async (
  dependencies: McpServerDependencies,
  input: McpSaveTemplateInput,
  session: McpWriteSession,
): Promise<McpTemplateOutput> => {
  const [collection, people] = await openMcpCollectionWithPeople(
    dependencies,
    session.call,
    input.collection,
    ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
  );
  const saved = await writeTemplate(dependencies, collection, people, input, session);
  return describeMcpTemplate(dependencies.portalUrl, session.call, collection, people, saved);
};

export const saveTemplateTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.saveTemplate,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.saveTemplate,
      {
        description:
          'Create a template of a collection, or change one. A template is the starting point of a row: the text of its page, the values of its columns and the columns it fills when the row is made. Without template it creates one (title is needed); with template (its name or id from list_templates) it changes that one, and whatever you leave out stays as it was. properties are the values the row starts with, written as for create_row, and replace all the values of the template when you update. variables name columns to fill at creation: "@today" in a date column puts the day the row is created, and "@me" in a person column puts whoever creates it; no other word is accepted, and a column in variables must not also be in properties. text is the page of the row. isDefault true makes it the template that create_row uses when you name none (one default at a time); false takes the default away if this one is it. A template is a page of the collection that is never a row: it does not appear in query_collection, counts or search. delete_template removes one.',
        inputSchema: saveTemplateInputSchema,
        outputSchema: templateOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.collection, tool: MCP_TOOL_NAMES.saveTemplate },
          (session) => saveTemplate(dependencies, input, session),
          (output) => `Template saved.\n${formatMcpTemplateText(output)}`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
