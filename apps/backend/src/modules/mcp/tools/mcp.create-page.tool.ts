import { ACCESS_TOKEN_PERMISSIONS, writeBlocksAsAnchoredMarkdown } from '@company-brain/shared';
import { MCP_DIAGRAM_LOGOS_NOTE, MCP_EMPTY_PAGE_CONTENT, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { requireMcpRowChangeAllowed } from '../lib/mcp.collections.lib';
import { requireMcpSuccess, resolveMcpCreationPlace } from '../lib/mcp.page-access.lib';
import { prepareMcpBlocks } from '../lib/mcp.page-writes.lib';
import { createdPageOutputSchema, createPageInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpCreatedPageOutput, McpCreatePageInput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const formatCreatedText = (output: McpCreatedPageOutput): string =>
  `Page created: ${output.title} (${output.id}) — ${output.url}\n\n${output.markdown}`;

const createPage = async (
  dependencies: McpServerDependencies,
  input: McpCreatePageInput,
  { call, record }: McpWriteSession,
): Promise<McpCreatedPageOutput> => {
  const { principal, workspace } = call;
  const place = await resolveMcpCreationPlace(dependencies, call, input, []);
  await requireMcpRowChangeAllowed(dependencies, call, { parentId: place.parentId, place: place.parentPlace });
  const prepared = input.blocks === undefined ? null : await prepareMcpBlocks(dependencies, call, input.blocks);
  const request = {
    blockIds: prepared?.blockIds ?? [],
    detail: { parentId: place.parentId, spaceId: place.spaceId, title: input.title },
    pageId: place.parentId,
    tool: MCP_TOOL_NAMES.createPage,
  };
  const created = await record(
    request,
    async () =>
      requireMcpSuccess(
        await dependencies.rows.create({
          content: prepared?.content ?? MCP_EMPTY_PAGE_CONTENT,
          parentId: place.parentId,
          propertyValues: null,
          role: principal.role,
          spaceId: place.spaceId,
          title: input.title,
          userId: principal.userId,
          workspaceId: workspace.id,
        }),
      ),
    (page) => page.id,
  );
  return {
    id: created.id,
    markdown: prepared === null ? '' : writeBlocksAsAnchoredMarkdown(prepared.nodes),
    title: created.title,
    url: buildMcpPageUrl(dependencies.portalUrl, created.spaceId, created.id, null),
  };
};

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
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.parent ?? input.space ?? null, tool: MCP_TOOL_NAMES.createPage },
          (session) => createPage(dependencies, input, session),
          formatCreatedText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
