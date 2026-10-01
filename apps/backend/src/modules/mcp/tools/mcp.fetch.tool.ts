import {
  ACCESS_TOKEN_PERMISSIONS,
  canAccessTokenAct,
  listPageBlocks,
  pageContentSchema,
  writeBlocksAsAnchoredMarkdown,
} from '@company-brain/shared';
import {
  MCP_BLOCK_NOT_FOUND_NOTE,
  MCP_INACCESSIBLE_MESSAGE,
  MCP_REDACTED_REFERENCE_LABEL,
  MCP_TOOL_NAMES,
  MCP_UNREADABLE_ADDRESS_MESSAGE,
  MCP_UNREADABLE_PAGE_MESSAGE,
} from '../constants/mcp.constants';
import {
  MCP_FETCH_BACKLINK_LIMIT,
  MCP_FETCH_COMMENT_LIMIT,
  MCP_FETCH_PART_MAX_CHARACTERS,
} from '../constants/mcp.limits.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { buildMcpPageUrl, readMcpAddress } from '../lib/mcp.address.lib';
import { findMcpBlockNode, listMcpBlockComments, takeMcpPagePart } from '../lib/mcp.blocks.lib';
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

/**
 * La página, si su dueño la ve y la regla más cercana del token deja leerla
 * donde está hoy. Si no, nada: quien pregunta contesta igual que si no
 * existiera, así una negativa no delata a la otra.
 */
const findReadablePage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
): Promise<McpPage | null> => {
  const { principal, workspace } = call;
  const result = await dependencies.pagesService.getAccessible(pageId, workspace.id, principal.userId, principal.role);
  if (result.isFail()) return null;
  const page = result.getValue();
  const place = await dependencies.placeReader.readPlace(page.id, workspace.id);
  if (place === null) return null;
  if (!canAccessTokenAct(principal.access, principal.role, place, ACCESS_TOKEN_PERMISSIONS.pagesRead)) return null;
  const content = pageContentSchema.safeParse(page.content);
  if (!content.success) throw new McpToolError(MCP_UNREADABLE_PAGE_MESSAGE);
  return { ...page, content: content.data };
};

/**
 * La página que tiene un bloque con ese id y que el agente puede ver.
 *
 * Casi siempre hay una sola; duplicar una página conserva los ids de sus
 * bloques, y entonces vale la primera que se pueda ver.
 */
const findPageHoldingBlock = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  blockId: string,
): Promise<McpPage | null> => {
  for (const pageId of await dependencies.searchService.locateBlock(blockId, call.workspace.id)) {
    const page = await findReadablePage(dependencies, call, pageId);
    if (page !== null) return page;
  }
  return null;
};

/** De las páginas a las que apunta el contenido, las que el agente puede ver, con su nombre y su espacio de hoy. */
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

/** Dónde está una página: sus ancestros, y en lugar de los que el agente no puede ver, un paso sin nombre. */
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

/** Si la página es una fila, lo que tiene en cada columna de su colección; si no, nada. */
const describeRowProperties = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
): Promise<McpRowProperty[]> => {
  const describeRow = await loadMcpRowDescriber(dependencies, call, page.parentId);
  return describeRow(page.propertyValues, page.title);
};

/**
 * La página: dónde está, sus propiedades si es una fila, lo que dice con el id
 * de cada bloque, lo que se comentó, lo que cuelga de ella y quién la enlaza.
 * Una página larga llega de a tramos, desde el bloque que diga el cursor.
 */
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
    dependencies.outline.listChildren(page.spaceId, page.id, call.viewer),
    listReachableBacklinks(dependencies, call, page),
    describeRowProperties(dependencies, call, page),
  ]);
  return {
    ...place,
    backlinks,
    children: children.map((child) => ({
      ...child,
      url: buildMcpPageUrl(dependencies.portalUrl, page.spaceId, child.id, null),
    })),
    comments: listMcpBlockComments(visible).slice(0, MCP_FETCH_COMMENT_LIMIT),
    markdown: writeBlocksAsAnchoredMarkdown(part.nodes),
    ...(part.nextStart === null ? {} : { nextCursor: String(part.nextStart) }),
    ...(properties.length === 0 ? {} : { properties }),
    state: describeMcpPageState(page, new Date()),
  };
};

/** Un bloque: lo que dice, bajo qué encabezados está, y la página que lo tiene. */
const presentBlock = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPage,
  blockId: string,
): Promise<McpFetchOutput> => {
  const node = findMcpBlockNode(page.content.content, blockId);
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

const present = async (
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

/** Un id suelto se prueba primero como página y después como bloque. */
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

/** Un enlace nombra la página: si no se puede ver, no se busca su bloque en otra parte. */
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
          `Open a page or a block you can access. Pass a Company Brain link (they start with ${dependencies.portalUrl}; pass it as the person gave it), a page id, or a block id.` +
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
            const start = cursor === undefined ? 0 : Number(cursor);
            return fetchOutputSchema.parse(await fetchAddress(dependencies, call, readMcpAddress(address), start));
          },
          formatMcpFetchText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
};
