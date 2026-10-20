import { deriveBlockId, PAGE_CONTENT_NODE_TYPES, type PageContent, pageContentSchema, Result } from '@neuma/shared';
import {
  BLOCK_MIGRATION_REMAP_NAMESPACE,
  BLOCK_MIGRATION_REMAP_SEPARATOR,
  BLOCK_MIGRATION_SYNCED_NODE,
} from '../constants/block.migration.constants';
import type { BlockIdRemap, BlockIdRemapsByPage, JsonRecord } from '../types/block.migration.types';

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A new id that depends only on the page and the old id, so a second run gives the same one. */
export const deriveRemappedBlockId = (pageId: string, oldBlockId: string): string =>
  deriveBlockId([BLOCK_MIGRATION_REMAP_NAMESPACE, pageId, oldBlockId].join(BLOCK_MIGRATION_REMAP_SEPARATOR), []);

/** Block ids are one table for every page, so each id has one owner: a page id owns itself. */
export const createBlockRegistry = (pageIds: readonly string[]): Map<string, string> =>
  new Map(pageIds.map((pageId) => [pageId, pageId]));

/**
 * Registers the ids of one page in the order the pages are visited. An id another page already owns gets a new id
 * for this page, derived from the page and the old id; the registry takes the new id as this page's.
 */
export const claimBlockIds = (
  registry: Map<string, string>,
  pageId: string,
  blockIds: readonly string[],
): BlockIdRemap[] => {
  const remaps: BlockIdRemap[] = [];
  for (const oldBlockId of blockIds) {
    const ownerPageId = registry.get(oldBlockId);
    if (ownerPageId === undefined) {
      registry.set(oldBlockId, pageId);
      continue;
    }
    if (ownerPageId === pageId) continue;
    const newBlockId = deriveRemappedBlockId(pageId, oldBlockId);
    registry.set(newBlockId, pageId);
    remaps.push({ newBlockId, oldBlockId, ownerPageId, pageId });
  }
  return remaps;
};

export const groupRemapsByPage = (remaps: readonly BlockIdRemap[]): BlockIdRemapsByPage => {
  const byPage = new Map<string, Map<string, string>>();
  for (const remap of remaps) {
    const pageRemaps = byPage.get(remap.pageId) ?? new Map<string, string>();
    pageRemaps.set(remap.oldBlockId, remap.newBlockId);
    byPage.set(remap.pageId, pageRemaps);
  }
  return byPage;
};

const readText = (attributes: JsonRecord, key: string): string | undefined => {
  const value = attributes[key];
  return typeof value === 'string' ? value : undefined;
};

const rewriteSyncedSource = (node: JsonRecord, attributes: JsonRecord, remaps: BlockIdRemapsByPage): JsonRecord => {
  if (node.type !== BLOCK_MIGRATION_SYNCED_NODE) return attributes;
  const sourcePageId = readText(attributes, 'pageId');
  const sourceBlockId = readText(attributes, 'blockId');
  if (sourcePageId === undefined || sourceBlockId === undefined) return attributes;
  const movedTo = remaps.get(sourcePageId)?.get(sourceBlockId);
  return movedTo === undefined ? attributes : { ...attributes, blockId: movedTo };
};

const rewriteNodeId = (attributes: JsonRecord, ownRemaps: ReadonlyMap<string, string> | undefined): JsonRecord => {
  const declaredId = readText(attributes, 'id');
  const movedTo = declaredId === undefined ? undefined : ownRemaps?.get(declaredId);
  return movedTo === undefined ? attributes : { ...attributes, id: movedTo };
};

const rewriteNode = (node: unknown, pageId: string, remaps: BlockIdRemapsByPage): unknown => {
  if (!isRecord(node)) return node;
  const rewritten: JsonRecord = { ...node };
  if (isRecord(node.attrs)) {
    rewritten.attrs = rewriteSyncedSource(node, rewriteNodeId(node.attrs, remaps.get(pageId)), remaps);
  }
  const isKnownNode = typeof node.type === 'string' && PAGE_CONTENT_NODE_TYPES.includes(node.type);
  if (isKnownNode && Array.isArray(node.content)) {
    rewritten.content = node.content.map((child: unknown) => rewriteNode(child, pageId, remaps));
  }
  return rewritten;
};

/**
 * Writes the remapped ids into a page document: the nodes of this page that changed id, and the synced blocks of any
 * page that point at one of them. Content an unknown node keeps is left as it was.
 */
export const rewriteBlockIds = (
  content: PageContent,
  pageId: string,
  remaps: BlockIdRemapsByPage,
): Result<PageContent> => {
  if (remaps.size === 0) return Result.ok(content);
  const rewrittenRoot = { ...content, content: content.content.map((node) => rewriteNode(node, pageId, remaps)) };
  const parsed = pageContentSchema.safeParse(rewrittenRoot);
  return parsed.success
    ? Result.ok(parsed.data)
    : Result.fail(new Error(`The page document is not valid after its ids were remapped: ${parsed.error.message}`));
};
