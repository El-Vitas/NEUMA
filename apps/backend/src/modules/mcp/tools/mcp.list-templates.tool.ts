import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { openMcpCollectionWithPeople } from '../lib/mcp.collections.lib';
import { requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpTemplate, formatMcpTemplateListText } from '../lib/mcp.templates.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { listTemplatesInputSchema, templateListOutputSchema } from '../schemas/mcp.templates.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

export const listTemplatesTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.listTemplates,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.listTemplates,
      {
        description:
          'List the templates of a collection (a table or board): the starting points a new row can copy. Each one has a name, the values and text a row made from it starts with, and the columns it fills when the row is made ("@today" in a date column, "@me" in a person column). One template may be the default: it is used when you create a row without naming a template. Templates are never rows, so query_collection and search do not return them. Use a name or an id from this list in create_row (template) or save_template.',
        inputSchema: listTemplatesInputSchema,
        outputSchema: templateListOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.listTemplates,
          async () => {
            const call = await openMcpCall(dependencies);
            const [collection, people] = await openMcpCollectionWithPeople(
              dependencies,
              call,
              input.collection,
              ACCESS_TOKEN_PERMISSIONS.collectionsRead,
            );
            const stored = requireMcpSuccess(
              await dependencies.templates.list({
                collectionId: collection.id,
                role: call.principal.role,
                userId: call.principal.userId,
                workspaceId: call.workspace.id,
              }),
            );
            return {
              collection: { id: collection.id, title: collection.title },
              defaultTemplateId: stored.defaultTemplateId,
              templates: stored.templates.map((template) =>
                describeMcpTemplate(dependencies.portalUrl, call, collection, people, template),
              ),
            };
          },
          formatMcpTemplateListText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.collectionsRead],
};
