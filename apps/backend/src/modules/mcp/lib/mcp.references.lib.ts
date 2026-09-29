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
  MCP_LABELED_REFERENCE_TYPES,
  MCP_REDACTED_REFERENCE_WORD,
} from '../constants/mcp.constants';
import type { McpPagePlace } from '../types/mcp.types';

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

/**
 * Lo que apunta a una página que el agente puede ver, con la página como es hoy.
 *
 * Una mención y una subpágina guardan el nombre y el espacio de cuando se
 * escribieron; si la página cambió de nombre o de espacio, el agente leería un
 * nombre que ya no existe y un enlace a un espacio donde ya no está.
 */
const bringUpToDate = (node: PageDocumentNodeShape, place: McpPagePlace): PageDocumentNodeShape => ({
  ...node,
  attrs: {
    ...node.attrs,
    ...(MCP_LABELED_REFERENCE_TYPES.includes(node.type) ? { label: place.title } : {}),
    spaceId: place.spaceId,
  },
});

const rewriteReference = (node: PageDocumentNodeShape, reachable: ReadonlyMap<string, McpPagePlace>): unknown => {
  const place = reachable.get(readPageDocumentText(node, 'pageId') ?? '');
  if (place !== undefined) return bringUpToDate(node, place);
  return MCP_INLINE_REFERENCE_TYPES.includes(node.type) ? MCP_REDACTED_REFERENCE_WORD : redactedBlock(node);
};

const hideNode = (node: unknown, reachable: ReadonlyMap<string, McpPagePlace>): unknown => {
  if (!isPageDocumentNode(node)) return node;
  if (pointsAtAPage(node)) return rewriteReference(node, reachable);
  if (node.content === undefined) return node;
  return { ...node, content: hideUnreachableReferences(node.content, reachable) };
};

/**
 * El contenido sin rastro de las páginas que el agente no puede ver, y con las
 * que sí puede ver nombradas como son hoy.
 *
 * Una mención, una subpágina, un bloque sincronizado o una colección que
 * apunta a una página que el token no alcanza dirían su título, su id o lo que
 * dice. En su lugar queda una marca que no nombra nada, y un bloque conserva su
 * id, así el agente todavía puede señalarlo.
 */
export const hideUnreachableReferences = (
  nodes: readonly unknown[],
  reachable: ReadonlyMap<string, McpPagePlace>,
): readonly unknown[] => nodes.map((node) => hideNode(node, reachable));
