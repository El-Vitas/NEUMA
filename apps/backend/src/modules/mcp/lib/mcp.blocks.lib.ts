import {
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageDocumentNodeShape,
  readPageDocumentBlockId,
  writeBlocksAsAnchoredMarkdown,
} from '@company-brain/shared';
import type { McpBlockComment, McpPagePart } from '../types/mcp.types';

/** El bloque de una página con ese id, donde sea que esté, o nada si ya no está. */
export const findMcpBlockNode = (nodes: readonly unknown[], blockId: string): PageDocumentNodeShape | null => {
  for (const node of nodes.filter(isPageDocumentNode)) {
    if (readPageDocumentBlockId(node) === blockId) return node;
    const inside = findMcpBlockNode(listPageDocumentChildren(node), blockId);
    if (inside !== null) return inside;
  }
  return null;
};

const isComment = (value: unknown): value is Omit<McpBlockComment, 'blockId'> =>
  typeof value === 'object' &&
  value !== null &&
  'author' in value &&
  typeof value.author === 'string' &&
  'body' in value &&
  typeof value.body === 'string' &&
  'createdAt' in value &&
  typeof value.createdAt === 'string';

const readComments = (node: PageDocumentNodeShape): readonly McpBlockComment[] => {
  const blockId = readPageDocumentBlockId(node);
  const comments = node.attrs?.comments;
  if (blockId === null || !Array.isArray(comments)) return [];
  return comments
    .filter(isComment)
    .map((comment) => ({ author: comment.author, blockId, body: comment.body, createdAt: comment.createdAt }));
};

/** Lo que se dijo sobre cada bloque de una página, con el bloque sobre el que se dijo, en el orden de la página. */
export const listMcpBlockComments = (nodes: readonly unknown[]): readonly McpBlockComment[] =>
  nodes
    .filter(isPageDocumentNode)
    .flatMap((node) => [...readComments(node), ...listMcpBlockComments(listPageDocumentChildren(node))]);

/**
 * Un tramo de una página, cortado entre bloques de arriba.
 *
 * Una página muy larga entregada de una vez se come la conversación del
 * agente. Se corta entre bloques, nunca en medio de uno, y siempre entra al
 * menos un bloque, aunque solo ya pase del tamaño: así el tramo siguiente
 * siempre avanza.
 */
export const takeMcpPagePart = (nodes: readonly unknown[], start: number, maxCharacters: number): McpPagePart => {
  const taken: unknown[] = [];
  let written = 0;
  for (const node of nodes.slice(start)) {
    const size = writeBlocksAsAnchoredMarkdown([node]).length;
    if (taken.length > 0 && written + size > maxCharacters) return { nextStart: start + taken.length, nodes: taken };
    taken.push(node);
    written += size;
  }
  return { nextStart: null, nodes: taken };
};
