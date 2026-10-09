import {
  isPageDocumentNode,
  readPageDocumentBlockId,
  readPageDocumentNodeStructure,
} from '../page-document/page-document.node.lib.js';
import type { PageDocumentNodeShape } from '../page-document/page-document.types.js';
import { type PageContent, pageContentSchema } from '../schemas/page-content.schema.js';

/** Si un nodo es de los que se señalan: los bloques llevan id, lo que va en una línea no. */
const carriesId = (node: PageDocumentNodeShape): boolean =>
  readPageDocumentNodeStructure(node.type)?.attrs?.id !== undefined;

/** El id que le queda a un bloque: el suyo si nadie lo usó antes, uno nuevo si no tenía o ya estaba tomado. */
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
 * La página con un id propio en cada bloque.
 *
 * Hace lo mismo que el editor al escribir: le da uno al bloque que no tiene, y
 * uno nuevo al segundo de dos que comparten el mismo. Así todo bloque se puede
 * señalar, aunque haya llegado por la API o de una versión anterior. Si ya
 * estaban todos, devuelve la misma página.
 */
export const givePageBlocksTheirIds = (content: PageContent, nextId: () => string): PageContent => {
  if (hasEveryIdOnce(content.content, new Set())) return content;
  return pageContentSchema.parse({ ...content, content: giveIds(content.content, new Set(), nextId) });
};
