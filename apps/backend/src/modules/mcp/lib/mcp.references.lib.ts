import {
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageDocumentNodeShape,
  readPageDocumentBlockId,
  readPageDocumentText,
} from '@company-brain/shared';
import {
  MCP_BLOCK_REFERENCE_TYPES,
  MCP_INLINE_REFERENCE_TYPES,
  MCP_REDACTED_REFERENCE_WORD,
} from '../constants/mcp.constants';

const pointsAtAPage = (node: PageDocumentNodeShape): boolean =>
  MCP_INLINE_REFERENCE_TYPES.includes(node.type) || MCP_BLOCK_REFERENCE_TYPES.includes(node.type);

const collectReferencedPageIds = (nodes: readonly unknown[]): readonly string[] =>
  nodes.filter(isPageDocumentNode).flatMap((node) => {
    const pageId = pointsAtAPage(node) ? readPageDocumentText(node, 'pageId') : undefined;
    const inside = collectReferencedPageIds(listPageDocumentChildren(node));
    return pageId === undefined ? inside : [pageId, ...inside];
  });

/** Las páginas a las que apunta un contenido, una vez cada una, en el orden en que aparecen. */
export const listReferencedPageIds = (nodes: readonly unknown[]): readonly string[] => [
  ...new Set(collectReferencedPageIds(nodes)),
];

/** Un bloque que mostraba una página que no se puede ver: queda una línea que no la nombra, con el mismo id. */
const redactedBlock = (node: PageDocumentNodeShape): PageDocumentNodeShape => {
  const blockId = readPageDocumentBlockId(node);
  return {
    ...(blockId === null ? {} : { attrs: { id: blockId } }),
    content: [MCP_REDACTED_REFERENCE_WORD],
    type: 'paragraph',
  };
};

const isUnreachable = (node: PageDocumentNodeShape, reachable: ReadonlySet<string>): boolean => {
  if (!pointsAtAPage(node)) return false;
  const pageId = readPageDocumentText(node, 'pageId');
  return pageId !== undefined && !reachable.has(pageId);
};

const hideNode = (node: unknown, reachable: ReadonlySet<string>): unknown => {
  if (!isPageDocumentNode(node)) return node;
  if (isUnreachable(node, reachable))
    return MCP_INLINE_REFERENCE_TYPES.includes(node.type) ? MCP_REDACTED_REFERENCE_WORD : redactedBlock(node);
  if (node.content === undefined) return node;
  return { ...node, content: hideUnreachableReferences(node.content, reachable) };
};

/**
 * El contenido sin rastro de las páginas que el agente no puede ver.
 *
 * Una mención, una subpágina, un bloque sincronizado o una colección que
 * apunta a una página que el token no alcanza dirían su título, su id o lo que
 * dice. En su lugar queda una marca que no nombra nada, y un bloque conserva su
 * id, así el agente todavía puede señalarlo.
 */
export const hideUnreachableReferences = (
  nodes: readonly unknown[],
  reachable: ReadonlySet<string>,
): readonly unknown[] => nodes.map((node) => hideNode(node, reachable));
