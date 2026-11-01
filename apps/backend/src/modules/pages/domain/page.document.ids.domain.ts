import { type PageContent, pageContentSchema, Result } from '@neuma/shared';
import type { DocumentIdMaps } from './page.block.domain.types';
import { PageContentValidationError } from './page.error';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNodeId = (node: Record<string, unknown>): string | null => {
  const id = isRecord(node.attrs) ? node.attrs.id : undefined;
  return typeof id === 'string' ? id : null;
};

const collectNodeIds = (node: unknown, ids: string[]): void => {
  if (!isRecord(node)) return;
  const id = readNodeId(node);
  if (id !== null) ids.push(id);
  if (!Array.isArray(node.content)) return;
  for (const child of node.content) collectNodeIds(child, ids);
};

/** The id of every block node of a document, in reading order. */
export const listDocumentBlockIds = (content: PageContent): string[] => {
  const ids: string[] = [];
  collectNodeIds(content, ids);
  return ids;
};

const replaceId = (
  attributes: Record<string, unknown>,
  key: string,
  newIds: ReadonlyMap<string, string>,
): Record<string, string> => {
  const current = attributes[key];
  const next = typeof current === 'string' ? newIds.get(current) : undefined;
  return next === undefined ? {} : { [key]: next };
};

const rewriteAttributes = (attributes: Record<string, unknown>, maps: DocumentIdMaps): Record<string, unknown> => ({
  ...attributes,
  ...replaceId(attributes, 'id', maps.blocks),
  ...replaceId(attributes, 'blockId', maps.blocks),
  ...replaceId(attributes, 'pageId', maps.pages),
});

const rewriteNode = (node: unknown, maps: DocumentIdMaps): unknown => {
  if (!isRecord(node)) return node;
  return {
    ...node,
    ...(isRecord(node.attrs) ? { attrs: rewriteAttributes(node.attrs, maps) } : {}),
    ...(Array.isArray(node.content) ? { content: node.content.map((child: unknown) => rewriteNode(child, maps)) } : {}),
  };
};

/**
 * The document with the ids of a copied branch replaced: the id of each block, the page and block a mention, a
 * subpage, a synced block or a collection points at when that target is part of the copy. Whatever points outside
 * the copy keeps pointing where it did.
 */
export const rewriteDocumentIds = (
  content: PageContent,
  maps: DocumentIdMaps,
): Result<PageContent, PageContentValidationError> => {
  const rewritten = pageContentSchema.safeParse(rewriteNode(content, maps));
  return rewritten.success
    ? Result.ok(rewritten.data)
    : Result.fail(new PageContentValidationError(rewritten.error.issues));
};
