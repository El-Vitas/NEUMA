import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import type { PageBlockSearchPage, SearchPage, SearchQueryFilters } from '../../../common/types/search.types';
import { MCP_INACCESSIBLE_MESSAGE, MCP_TOOL_NAMES, MCP_VERIFIED_HIT_MARK } from '../constants/mcp.constants';
import { MCP_SEARCH_PAGE_TITLE_LIMIT } from '../constants/mcp.limits.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { buildMcpPageUrl } from '../lib/mcp.address.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { searchInputSchema, searchOutputSchema } from '../schemas/mcp.schemas';
import type {
  McpCall,
  McpSearchInput,
  McpSearchOutput,
  McpServerDependencies,
  McpToolDefinition,
} from '../types/mcp.types';

/** Searching under a page requires the agent to see it; otherwise it is answered as missing. */
const requireReachableRoot = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string | undefined,
): Promise<void> => {
  if (pageId === undefined) return;
  const readable = await dependencies.outline.listReadable([pageId], call.viewer);
  if (readable.length === 0) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
};

const readPageFilters = (input: McpSearchInput): SearchQueryFilters => ({
  ...(input.author === undefined ? {} : { authorQuery: input.author }),
  ...(input.editedWithin === undefined ? {} : { editedRange: input.editedWithin }),
  ...(input.verifiedOnly === true ? { verifiedOnly: true } : {}),
});

const findBlocks = (dependencies: McpServerDependencies, call: McpCall, input: McpSearchInput) =>
  dependencies.searchService.searchBlocks({
    ...readPageFilters(input),
    ...(input.blockType === undefined ? {} : { blockType: input.blockType }),
    ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
    ...(input.pageId === undefined ? {} : { rootPageId: input.pageId }),
    ...(input.spaceId === undefined ? {} : { spaceId: input.spaceId }),
    limit: input.limit,
    query: input.query,
    tokenScope: call.viewer.tokenScope,
    userId: call.principal.userId,
    userRole: call.principal.role,
    workspaceId: call.workspace.id,
  });

/** Block search ignores titles. Only in the first batch and not under a page, where the tree decides. */
const findPages = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  input: McpSearchInput,
): Promise<SearchPage> => {
  if (input.cursor !== undefined || input.pageId !== undefined) return { items: [] };
  return dependencies.searchService.search({
    ...readPageFilters(input),
    ...(input.spaceId === undefined ? {} : { spaceId: input.spaceId }),
    limit: MCP_SEARCH_PAGE_TITLE_LIMIT,
    query: input.query,
    sourceType: 'PAGE',
    tokenScope: call.viewer.tokenScope,
    userId: call.principal.userId,
    userRole: call.principal.role,
    workspaceId: call.workspace.id,
  });
};

const toSearchOutput = (portalUrl: string, blocks: PageBlockSearchPage, pages: SearchPage): McpSearchOutput => {
  const pagesWithBlocks = new Set(blocks.items.map((item) => item.pageId));
  return searchOutputSchema.parse({
    blocks: blocks.items.map((item) => ({
      blockId: item.blockId,
      blockType: item.blockType,
      isPageVerified: item.isPageVerified,
      pageId: item.pageId,
      pageTitle: item.pageTitle,
      section: item.headingPath,
      snippet: item.snippet,
      spaceId: item.spaceId,
      spaceName: item.spaceName,
      url: buildMcpPageUrl(portalUrl, item.spaceId, item.pageId, item.blockId),
    })),
    ...(blocks.nextCursor === undefined ? {} : { nextCursor: blocks.nextCursor }),
    pages: pages.items
      .filter((item) => !pagesWithBlocks.has(item.sourceId))
      .map((item) => ({
        isVerified: item.isVerified,
        pageId: item.sourceId,
        snippet: item.snippet,
        spaceId: item.spaceId,
        title: item.title,
        url: buildMcpPageUrl(portalUrl, item.spaceId, item.sourceId, null),
      })),
  });
};

const formatSearchText = (output: McpSearchOutput): string => {
  const blocks = output.blocks.map((block) => {
    const where = [block.pageTitle, ...block.section].join(' › ');
    const verified = block.isPageVerified ? MCP_VERIFIED_HIT_MARK : '';
    return `- ${where} (${block.blockType}, block ${block.blockId}${verified})\n  ${block.snippet}\n  ${block.url}`;
  });
  const pages = output.pages.map(
    (page) => `- ${page.title} (page ${page.pageId}${page.isVerified ? MCP_VERIFIED_HIT_MARK : ''})\n  ${page.url}`,
  );
  const sections = [
    blocks.length === 0 ? '' : `Blocks:\n${blocks.join('\n')}`,
    pages.length === 0 ? '' : `Pages:\n${pages.join('\n')}`,
    output.nextCursor === undefined ? '' : `More blocks with cursor: ${output.nextCursor}`,
  ].filter((section) => section !== '');
  return sections.length === 0 ? 'Nothing in Neuma matches.' : sections.join('\n\n');
};

export const searchTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.search,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.search,
      {
        description:
          "Search everything in Neuma you can access: the team's documentation, notes, processes, projects, and its tasks. Returns the blocks that match, each with its page, section and link, and pages whose title matches. Start here to find information; open a result with fetch. What comes from a page someone vouched for as up to date is marked as verified: prefer it when results disagree, or keep only those with verifiedOnly. To go through a board or task list, find it and list the pages under it.",
        inputSchema: searchInputSchema,
        outputSchema: searchOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.search,
          async () => {
            const call = await openMcpCall(dependencies);
            await requireReachableRoot(dependencies, call, input.pageId);
            const [blocks, pages] = await Promise.all([
              findBlocks(dependencies, call, input),
              findPages(dependencies, call, input),
            ]);
            return toSearchOutput(dependencies.portalUrl, blocks, pages);
          },
          formatSearchText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
