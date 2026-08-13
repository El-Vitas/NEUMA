import { isKnownPageContentNode, type PageContent, type PageContentNode } from '@company-brain/shared';
import { PAGE_EDITOR_UNSUPPORTED_TYPE } from '../constants/pages.editor.blocks.constants';

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isUnsupportedBlock = (node: Record<string, unknown>): boolean => node.type === PAGE_EDITOR_UNSUPPORTED_TYPE;

/**
 * A block this version does not know, turned into one it can hold: the type it
 * says it is, and the whole of it word for word.
 */
const holdUnknownBlock = (node: PageContentNode): PageContentNode => ({
  attrs: { name: node.type, source: JSON.stringify(node) },
  type: PAGE_EDITOR_UNSUPPORTED_TYPE,
});

const holdUnknownBlocks = (nodes: readonly PageContentNode[]): readonly PageContentNode[] =>
  nodes.map((node) => {
    if (!isKnownPageContentNode(node)) return holdUnknownBlock(node);
    if (!('content' in node) || node.type === 'paragraph' || node.type === 'heading' || node.type === 'code_block') {
      return node;
    }
    return { ...node, content: [...holdUnknownBlocks(node.content)] };
  });

/**
 * The page as the editor can read it.
 *
 * What this version does not know becomes a placeholder that carries the
 * original, so the page opens whole instead of failing on the one block nobody
 * here understands.
 */
export const holdPageContentThisVersionCannotRead = (content: PageContent): PageContent => ({
  ...content,
  content: [...holdUnknownBlocks(content.content)],
});

/** What was being held, read back out of the placeholder. */
const releaseUnknownBlock = (node: Record<string, unknown>): Record<string, unknown> => {
  const source = isJsonObject(node.attrs) ? node.attrs.source : null;
  if (typeof source !== 'string') return node;
  const original: unknown = JSON.parse(source);
  return isJsonObject(original) ? original : node;
};

const releaseUnknownBlocks = (nodes: readonly unknown[]): readonly unknown[] =>
  nodes.map((node) => {
    if (!isJsonObject(node)) return node;
    if (isUnsupportedBlock(node)) return releaseUnknownBlock(node);
    if (!Array.isArray(node.content)) return node;
    return { ...node, content: releaseUnknownBlocks(node.content) };
  });

/**
 * The page as it is written back.
 *
 * Every placeholder gives up the block it was holding, exactly as it arrived:
 * what nobody here can read, nobody here rewrites — a version that does
 * understand it will find it as it left it.
 */
export const releasePageContentThisVersionCannotRead = (document: Record<string, unknown>): Record<string, unknown> =>
  Array.isArray(document.content) ? { ...document, content: releaseUnknownBlocks(document.content) } : document;
