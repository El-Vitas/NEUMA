import {
  isPageDocumentNode,
  readPageDocumentBlockId,
  readPageDocumentNodeStructure,
} from '../page-document/page-document.node.lib.js';
import type { PageDocumentNodeShape } from '../page-document/page-document.types.js';
import { type PageContent, pageContentSchema } from '../schemas/page-content.schema.js';

const carriesId = (node: PageDocumentNodeShape): boolean =>
  readPageDocumentNodeStructure(node.type)?.attrs?.id !== undefined;

const settleId = (node: PageDocumentNodeShape, seen: Set<string>, nextId: () => string): string => {
  const own = readPageDocumentBlockId(node);
  const settled = own === null || seen.has(own) ? nextId() : own;
  seen.add(settled);
  return settled;
};

const giveIds = (nodes: readonly unknown[], seen: Set<string>, nextId: () => string): readonly unknown[] =>
  nodes.map((node) => {
    if (!isPageDocumentNode(node)) return node;
    const withId = carriesId(node) ? { ...node, attrs: { ...node.attrs, id: settleId(node, seen, nextId) } } : node;
    return node.content === undefined ? withId : { ...withId, content: giveIds(node.content, seen, nextId) };
  });

const hasEveryIdOnce = (nodes: readonly unknown[], seen: Set<string>): boolean =>
  nodes.every((node) => {
    if (!isPageDocumentNode(node)) return true;
    if (carriesId(node)) {
      const own = readPageDocumentBlockId(node);
      if (own === null || seen.has(own)) return false;
      seen.add(own);
    }
    return hasEveryIdOnce(node.content ?? [], seen);
  });

/**
 * Mirrors the editor: gives an id to a block without one and a fresh id to the
 * second of two sharing one, so content from the API or an older version is
 * addressable. Returns the same page when every id is already unique.
 */
export const givePageBlocksTheirIds = (content: PageContent, nextId: () => string): PageContent => {
  if (hasEveryIdOnce(content.content, new Set())) return content;
  return pageContentSchema.parse({ ...content, content: giveIds(content.content, new Set(), nextId) });
};
