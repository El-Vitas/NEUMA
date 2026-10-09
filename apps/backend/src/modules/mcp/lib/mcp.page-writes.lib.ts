import { randomUUID } from 'node:crypto';
import {
  ACCESS_TOKEN_PERMISSIONS,
  type AccessTokenPlace,
  findPageBlock,
  givePageBlocksTheirIds,
  isPageDocumentNode,
  PAGE_CONTENT_SCHEMA_VERSION,
  type PageContent,
  pageContentSchema,
  Result,
  readPageDocumentBlockId,
  writeBlocksAsAnchoredMarkdown,
} from '@company-brain/shared';
import { MCP_REDACTED_REFERENCE_LABEL, MCP_WRITTEN_UNREADABLE_NOTE } from '../constants/mcp.constants';
import type {
  McpBlockInput,
  McpContentEdit,
  McpPreparedBlocks,
  McpWrittenBlocksOutput,
} from '../types/mcp.pages.types';
import type { McpCall, McpPagePlace, McpPageSource, McpServerDependencies } from '../types/mcp.types';
import { buildMcpPageUrl } from './mcp.address.lib';
import { buildMcpBlockNodes } from './mcp.block-input.lib';
import { readMcpBlockInContext } from './mcp.blocks.lib';
import { settleMcpCollectionTargets } from './mcp.collection-targets.lib';
import { checkMcpDrawings } from './mcp.drawing-checks.lib';
import { canMcpAct, requireMcpInput, requireMcpSuccess } from './mcp.page-access.lib';
import { hideUnreachableReferences, listReferencedPageIds, settleWrittenReferences } from './mcp.references.lib';
import { checkMcpSyncedTargets } from './mcp.synced-targets.lib';

/** Las páginas a las que apuntan unos bloques y que el token alcanza, con su nombre y su espacio de hoy. */
const listReachablePlaces = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  nodes: readonly unknown[],
): Promise<ReadonlyMap<string, McpPagePlace>> => {
  const reachable = await dependencies.outline.listReadable(listReferencedPageIds(nodes), call.viewer);
  return new Map(reachable.map((place) => [place.id, place]));
};

const readAsPage = (nodes: readonly unknown[]): Result<PageContent, string> => {
  const parsed = pageContentSchema.safeParse({
    content: nodes,
    schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
    type: 'doc',
  });
  if (parsed.success) return Result.ok(parsed.data);
  const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  return Result.fail(`These blocks are not ones a page can hold: ${problems}`);
};

/** Los mismos bloques con cada mención y cada persona como son hoy, o por qué no se pueden escribir. */
export const settleMcpWrittenNodes = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  nodes: readonly unknown[],
): Promise<unknown[]> => {
  const [reachable, people] = await Promise.all([
    listReachablePlaces(dependencies, call, nodes),
    dependencies.people.listAssignableMembers(call.workspace.id),
  ]);
  return requireMcpInput(settleWrittenReferences(nodes, reachable, people));
};

/**
 * Unos textos escritos como párrafos —las celdas de una tabla—, revisados igual
 * que un bloque: sus fórmulas, a quién nombran y a qué páginas apuntan. Uno por
 * texto, en el mismo orden.
 */
export const prepareMcpParagraphs = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  texts: readonly string[],
): Promise<unknown[]> => {
  if (texts.length === 0) return [];
  const built = requireMcpInput(buildMcpBlockNodes(texts.map((text) => ({ text, type: 'paragraph' }))));
  await checkMcpDrawings(dependencies, built);
  return settleMcpWrittenNodes(dependencies, call, built);
};

/**
 * Lo que el agente escribió, listo para la página: armado, con las menciones y
 * las personas revisadas, y con un id en cada bloque, para poder devolvérselos.
 */
export const prepareMcpBlocks = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  blocks: readonly McpBlockInput[],
): Promise<McpPreparedBlocks> => {
  const built = requireMcpInput(buildMcpBlockNodes(blocks));
  await checkMcpDrawings(dependencies, built);
  const settled = await settleMcpWrittenNodes(dependencies, call, built);
  const [targeted] = await Promise.all([
    settleMcpCollectionTargets(dependencies, call, settled),
    checkMcpSyncedTargets(dependencies, call, settled),
  ]);
  const withIds = givePageBlocksTheirIds(requireMcpInput(readAsPage(targeted)), randomUUID);
  return { blockIds: listTopBlockIds(withIds.content), content: withIds, nodes: withIds.content };
};

const listTopBlockIds = (nodes: readonly unknown[]): readonly string[] =>
  nodes.filter(isPageDocumentNode).flatMap((node) => readPageDocumentBlockId(node) ?? []);

/** Escribe en una página por su documento en vivo, como su dueño y en el espacio donde está hoy. */
export const writeMcpContent = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  page: McpPageSource,
  edit: McpContentEdit,
): Promise<PageContent> => {
  const { principal, workspace } = call;
  const writer = {
    pageId: page.id,
    role: principal.role,
    spaceId: page.spaceId,
    userId: principal.userId,
    workspaceId: workspace.id,
  };
  return requireMcpSuccess(await dependencies.content.edit(writer, edit));
};

/**
 * Los bloques escritos como quedaron en la página. Una lista que cayó dentro
 * de otra ya no existe como tal: quedan sus ítems, y son esos los que se nombran.
 */
export const listMcpWrittenBlockIds = (content: PageContent, nodes: readonly unknown[]): readonly string[] =>
  nodes.filter(isPageDocumentNode).flatMap((node) => {
    const blockId = readPageDocumentBlockId(node);
    if (blockId !== null && findPageBlock(content.content, blockId) !== null) return [blockId];
    return listMcpWrittenBlockIds(content, node.content ?? []);
  });

/**
 * Lo que devuelve una escritura: la página y los bloques tocados como quedaron,
 * con sus ids, así el agente no tiene que volver a leer. Lo que apunta a una
 * página que el token no alcanza se oculta igual que al leer.
 *
 * Un token que escribe pero no lee donde está la página recibe solo los ids y
 * el enlace: devolverle lo que el bloque dice sería dejarlo leer por la puerta
 * de la escritura.
 */
export const describeMcpWrittenBlocks = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  written: { readonly content: PageContent; readonly page: McpPageSource; readonly place: AccessTokenPlace },
  blockIds: readonly string[],
): Promise<McpWrittenBlocksOutput> => {
  const { content, page, place } = written;
  const url = buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, null);
  if (!canMcpAct(call, place, ACCESS_TOKEN_PERMISSIONS.pagesRead))
    return { blockIds: [...blockIds], markdown: '', page: { id: page.id, title: MCP_REDACTED_REFERENCE_LABEL, url } };
  const nodes = blockIds
    .map((blockId) => readMcpBlockInContext(content.content, blockId))
    .filter((node) => node !== null);
  const reachable = await listReachablePlaces(dependencies, call, nodes);
  return {
    blockIds: [...blockIds],
    markdown: writeBlocksAsAnchoredMarkdown(hideUnreachableReferences(nodes, reachable)),
    page: { id: page.id, title: page.title, url },
  };
};

/** Una escritura de bloques en texto: dónde quedó y cómo quedó, o solo dónde, si el token no lee ahí. */
export const formatMcpWrittenBlocksText = (output: McpWrittenBlocksOutput): string =>
  output.page.title === MCP_REDACTED_REFERENCE_LABEL
    ? `${MCP_WRITTEN_UNREADABLE_NOTE} ${output.page.url}\nBlocks: ${output.blockIds.join(', ')}`
    : `${output.page.title} — ${output.page.url}\n\n${output.markdown}`;
