import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { openMcpCollection } from '../lib/mcp.collections.lib';
import { requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { pickMcpTemplate } from '../lib/mcp.templates.lib';
import { readMcpActor } from '../lib/mcp.tool.lib';
import { deleteTemplateInputSchema, deleteTemplateOutputSchema } from '../schemas/mcp.templates.schemas';
import type { McpDeleteTemplateInput } from '../types/mcp.templates.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const deleteTemplate = async (
  dependencies: McpServerDependencies,
  input: McpDeleteTemplateInput,
  { call, record }: McpWriteSession,
): Promise<{ deleted: boolean; title: string }> => {
  const collection = await openMcpCollection(
    dependencies,
    call,
    input.collection,
    ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
  );
  const actor = readMcpActor(call);
  const stored = requireMcpSuccess(await dependencies.templates.list({ ...actor, collectionId: collection.id }));
  const template = requireMcpInput(pickMcpTemplate(stored.templates, input.template, collection.listNames));
  const request = {
    blockIds: [],
    detail: { collectionId: collection.id, template: template.id },
    pageId: collection.id,
    tool: MCP_TOOL_NAMES.deleteTemplate,
  };
  await record(request, async () =>
    requireMcpSuccess(
      await dependencies.templates.remove({ ...actor, collectionId: collection.id, templateId: template.id }),
    ),
  );
  return { deleted: true, title: template.title };
};

export const deleteTemplateTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.deleteTemplate,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.deleteTemplate,
      {
        description:
          'Delete a template of a collection, by its name or its id. Rows already made from it are not touched. If it was the default, the collection has no default afterwards. It goes to the trash, where list_trash shows it as a template and restore_page brings it back among the templates (not as the default again).',
        inputSchema: deleteTemplateInputSchema,
        outputSchema: deleteTemplateOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.collection, tool: MCP_TOOL_NAMES.deleteTemplate },
          (session) => deleteTemplate(dependencies, input, session),
          (output) => `Template "${output.title}" deleted.`,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
};
