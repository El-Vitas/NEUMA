import { ACCESS_TOKEN_PERMISSIONS, writeBlocksAsAnchoredMarkdown } from '@company-brain/shared';
import { MCP_DIAGRAM_LOGOS_NOTE, MCP_EMPTY_PAGE_CONTENT, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { requireMcpSuccess, resolveMcpCreationPlace } from '../lib/mcp.page-access.lib';
import { prepareMcpBlocks } from '../lib/mcp.page-writes.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { createdPageOutputSchema, createPageInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpCreatedPageOutput } from '../types/mcp.pages.types';
import type { McpToolDefinition } from '../types/mcp.types';

const formatCreatedText = (output: McpCreatedPageOutput): string =>
  `Page created: ${output.title} (${output.id}) — ${output.url}\n\n${output.markdown}`;

/** Crea una página, bajo otra o arriba del todo en un espacio, y opcionalmente con lo que dice. */
export const createPageTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.createPage,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.createPage,
      {
        description: `Create a page under another page, or at the top of a space, with a title and, if you want, its first blocks. Returns its link and its blocks with their ids. ${MCP_DIAGRAM_LOGOS_NOTE}`,
        inputSchema: createPageInputSchema,
        outputSchema: createdPageOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.createPage,
          async () => {
            const call = await openMcpCall(dependencies);
            const { principal, workspace } = call;
            const place = await resolveMcpCreationPlace(dependencies, call, input, []);
            const prepared =
              input.blocks === undefined ? null : await prepareMcpBlocks(dependencies, call, input.blocks);
            const request = {
              blockIds: prepared?.blockIds ?? [],
              detail: { title: input.title },
              pageId: place.parentId,
              tool: MCP_TOOL_NAMES.createPage,
            };
            const created = await recordMcpWrite(dependencies, call, request, async () =>
              requireMcpSuccess(
                await dependencies.rows.create(
                  {
                    content: prepared?.content ?? MCP_EMPTY_PAGE_CONTENT,
                    createdById: principal.userId,
                    parentId: place.parentId,
                    propertyValues: null,
                    role: principal.role,
                    spaceId: place.spaceId,
                    title: input.title,
                    userId: principal.userId,
                    workspaceId: workspace.id,
                  },
                  principal.role,
                ),
              ),
            );
            return {
              id: created.id,
              markdown: prepared === null ? '' : writeBlocksAsAnchoredMarkdown(prepared.nodes),
              title: created.title,
              url: buildMcpPageUrl(dependencies.portalUrl, created.spaceId, created.id, null),
            };
          },
          formatCreatedText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
