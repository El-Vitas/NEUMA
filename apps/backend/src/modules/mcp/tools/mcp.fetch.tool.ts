import { PageLifecycle } from '@neuma/db';
import {
  ACCESS_TOKEN_PERMISSIONS,
  canAccessTokenAct,
  findPageBlock,
  listPageBlocks,
  pageContentSchema,
  writeBlocksAsAnchoredMarkdown,
} from '@neuma/shared';
import {
  MCP_BLOCK_NOT_FOUND_NOTE,
  MCP_FETCHED_IN_TRASH_NOTE,
  MCP_INACCESSIBLE_MESSAGE,
  MCP_REDACTED_REFERENCE_LABEL,
  MCP_TOOL_NAMES,
  MCP_UNREADABLE_ADDRESS_MESSAGE,
  MCP_UNREADABLE_PAGE_MESSAGE,
} from '../constants/mcp.constants';
import {
  MCP_FETCH_BACKLINK_LIMIT,
  MCP_FETCH_CHILD_LIMIT,
  MCP_FETCH_COMMENT_LIMIT,
  MCP_FETCH_PART_MAX_CHARACTERS,
} from '../constants/mcp.limits.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { buildMcpPageUrl, readMcpAddress, readMcpOffset } from '../lib/mcp.address.lib';
import { listMcpBlockComments, takeMcpPagePart } from '../lib/mcp.blocks.lib';
import { formatMcpFetchText } from '../lib/mcp.fetch.text.lib';
import { describeMcpPageState } from '../lib/mcp.page-state.lib';
import { hideUnreachableReferences, listReferencedPageIds } from '../lib/mcp.references.lib';
import { loadMcpRowDescriber } from '../lib/mcp.rows.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { fetchInputSchema, fetchOutputSchema } from '../schemas/mcp.schemas';
import type {
  McpAddress,
  McpCall,
  McpFetchedPage,
  McpFetchOutput,
  McpPage,
  McpPagePlace,
  McpRowProperty,
  McpServerDependencies,
  McpToolDefinition,
} from '../types/mcp.types';

/** Denials answer as if the page did not exist, so one denial does not reveal the other. */
const findReadablePage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
): Promise<McpPage | null> => {
  const { principal, workspace } = call;
  const [result, place] = await Promise.all([
    dependencies.pagesService.getAccessible(pageId, workspace.id, principal.userId, principal.role),
    dependencies.placeReader.readPlace(pageId, workspace.id),
  ]);
  if (result.isFail() || place === null) return null;
  const page = result.getValue();
  if (!canAccessTokenAct(principal.access, principal.role, place, ACCESS_TOKEN_PERMISSIONS.pagesRead)) return null;
  const content = pageContentSchema.safeParse(page.content);
  if (!content.success) throw new McpToolError(MCP_UNREADABLE_PAGE_MESSAGE);
  return { ...page, content: content.data };
};

/** A block closed to the person is not looked up: it answers as a block that is nowhere. */
const findPageHoldingBlock = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  blockId: string,
): Promise<McpPage | null> => {
  for (const pageId of await dependencies.searchService.locateBlock(blockId, call.workspace.id)) {
    const page = await findReadablePage(dependencies, call, pageId);
    if (page !== null && findPageBlock(page.content.content, blockId) !== null) return page;
  }
  return null;
};

const listReachableReferences = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
): Promise<ReadonlyMap<string, McpPagePlace>> => {
  const referenced = listReferencedPageIds(page.content.content);
  const reachable = await dependencies.outline.listReadable(referenced, call.viewer);
  return new Map(reachable.map((reference) => [reference.id, reference]));
};

const listReachableBacklinks = async (dependencies: McpServerDependencies, call: McpCall, page: McpPage) => {
  const { principal, workspace } = call;
  const backlinks = await dependencies.backlinks.listBacklinks(page.id, workspace.id, principal.userId, principal.role);
  const reachable = await dependencies.outline.listReadable(
    backlinks.items.map((backlink) => backlink.id),
    call.viewer,
  );
  const reachableIds = new Set(reachable.map((backlink) => backlink.id));
  return backlinks.items
    .filter((backlink) => reachableIds.has(backlink.id))
    .slice(0, MCP_FETCH_BACKLINK_LIMIT)
    .map((backlink) => ({
      id: backlink.id,
      title: backlink.title,
      url: buildMcpPageUrl(dependencies.portalUrl, backlink.spaceId, backlink.id, null),
    }));
};

const describePlace = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
): Promise<McpFetchedPage> => {
  const ancestors = await dependencies.outline.listAncestors(page.id, call.viewer);
  return {
    id: page.id,
    path: ancestors.map((ancestor) =>
      ancestor.isReadable
        ? { id: ancestor.id, title: ancestor.title }
        : { id: null, title: MCP_REDACTED_REFERENCE_LABEL },
    ),
    spaceId: page.spaceId,
    title: page.title,
    url: buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, null),
    version: page.version,
  };
};

const describeRowProperties = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
): Promise<McpRowProperty[]> => {
  const describeRow = await loadMcpRowDescriber(dependencies, call, page.parentId);
  return describeRow(page);
};

/** Capped: a large collection has thousands of rows, more than the agent can take at once. */
const describeChildren = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
): Promise<Pick<McpFetchedPage, 'children' | 'moreChildren'>> => {
  const children = await dependencies.outline.listChildren(page.spaceId, page.id, call.viewer, {
    skip: 0,
    take: MCP_FETCH_CHILD_LIMIT,
  });
  const shown = children.entries.map((child) => ({
    childCount: child.childCount,
    id: child.id,
    isCollection: child.isCollection,
    title: child.title,
    url: buildMcpPageUrl(dependencies.portalUrl, page.spaceId, child.id, null),
  }));
  const more = children.total - shown.length;
  return { children: shown, ...(more > 0 ? { moreChildren: more } : {}) };
};

const describePage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
  reachable: ReadonlyMap<string, McpPagePlace>,
  start: number,
): Promise<McpFetchedPage> => {
  const visible = hideUnreachableReferences(page.content.content, reachable);
  const part = takeMcpPagePart(visible, start, MCP_FETCH_PART_MAX_CHARACTERS);
  const [place, children, backlinks, properties] = await Promise.all([
    describePlace(dependencies, call, page),
    describeChildren(dependencies, call, page),
    listReachableBacklinks(dependencies, call, page),
    describeRowProperties(dependencies, call, page),
  ]);
  return {
    ...place,
    ...children,
    backlinks,
    comments: listMcpBlockComments(visible).slice(0, MCP_FETCH_COMMENT_LIMIT),
    markdown: writeBlocksAsAnchoredMarkdown(part.nodes),
    ...(part.nextStart === null ? {} : { nextCursor: String(part.nextStart) }),
    ...(properties.length === 0 ? {} : { properties }),
    state: describeMcpPageState(page, new Date()),
  };
};

const presentBlock = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
  blockId: string,
): Promise<McpFetchOutput> => {
  const node = findPageBlock(page.content.content, blockId);
  const reachable = await listReachableReferences(dependencies, call, page);
  if (node === null)
    return { note: MCP_BLOCK_NOT_FOUND_NOTE, page: await describePage(dependencies, call, page, reachable, 0) };
  const section = listPageBlocks(page.content).find((block) => block.id === blockId)?.headingPath ?? [];
  return {
    block: {
      id: blockId,
      markdown: writeBlocksAsAnchoredMarkdown(hideUnreachableReferences([node], reachable)),
      section: [...section],
      type: node.type,
      url: buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, blockId),
    },
    page: await describePlace(dependencies, call, page),
  };
};

const presentInLifecycle = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
  blockId: string | null,
  start: number,
): Promise<McpFetchOutput> => {
  if (blockId !== null) return presentBlock(dependencies, call, page, blockId);
  const reachable = await listReachableReferences(dependencies, call, page);
  return { page: await describePage(dependencies, call, page, reachable, start) };
};

/** A trashed page is readable but flagged first, since its content no longer applies. */
const present = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
  blockId: string | null,
  start: number,
): Promise<McpFetchOutput> => {
  const output = await presentInLifecycle(dependencies, call, page, blockId, start);
  if (page.lifecycle === PageLifecycle.ACTIVE) return output;
  const note = output.note === undefined ? MCP_FETCHED_IN_TRASH_NOTE : `${MCP_FETCHED_IN_TRASH_NOTE} ${output.note}`;
  return { ...output, note };
};

const fetchById = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  id: string,
  start: number,
): Promise<McpFetchOutput> => {
  const page = await findReadablePage(dependencies, call, id);
  if (page !== null) return present(dependencies, call, page, null, start);
  const holder = await findPageHoldingBlock(dependencies, call, id);
  if (holder === null) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  return present(dependencies, call, holder, id, start);
};

/** A link names the page: if it is not visible, its block is not looked up elsewhere. */
const fetchByPage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
  blockId: string | null,
  start: number,
): Promise<McpFetchOutput> => {
  const page = await findReadablePage(dependencies, call, pageId);
  if (page === null) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  return present(dependencies, call, page, blockId, start);
};

const fetchAddress = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  address: McpAddress,
  start: number,
): Promise<McpFetchOutput> => {
  switch (address.kind) {
    case 'id':
      return fetchById(dependencies, call, address.id, start);
    case 'page':
      return fetchByPage(dependencies, call, address.pageId, address.blockId, start);
    default:
      throw new McpToolError(MCP_UNREADABLE_ADDRESS_MESSAGE);
  }
};

export const fetchTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.fetch,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.fetch,
      {
        description:
          `Open a page or a block you can access. Pass a Neuma link (they start with ${dependencies.portalUrl}; pass it as the person gave it), a page id, or a block id.` +
          ' A page comes back as Markdown with each block id in the comment before it, plus its properties if it is a row of a collection, its comments, the pages under it and the pages linking to it; a long page comes in parts, with a cursor for the next one. A block comes back with its section and its page.',
        inputSchema: fetchInputSchema,
        outputSchema: fetchOutputSchema,
      },
      async ({ address, cursor }) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.fetch,
          async () => {
            const call = await openMcpCall(dependencies);
            return fetchOutputSchema.parse(
              await fetchAddress(dependencies, call, readMcpAddress(address), readMcpOffset(cursor)),
            );
          },
          formatMcpFetchText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
