import {
  isPageDocumentNode,
  listPageDocumentChildren,
  PAGE_BLOCK_ITEM_TYPES,
  type PageDocumentNodeShape,
  readPageDocumentBlockId,
  writeBlocksAsAnchoredMarkdown,
} from '@neuma/shared';
import type { McpHeldBlock, McpPagePart } from '../types/mcp.types';

const findHeldBlock = (
  nodes: readonly unknown[],
  blockId: string,
  holder: PageDocumentNodeShape | null,
): McpHeldBlock | null => {
  for (const node of nodes.filter(isPageDocumentNode)) {
    if (readPageDocumentBlockId(node) === blockId) return { holder, node };
    const inside = findHeldBlock(listPageDocumentChildren(node), blockId, node);
    if (inside !== null) return inside;
  }
  return null;
};

/** A bare item is wrapped in a list of its kind; the list gets no id since it was not what was named. */
export const readMcpBlockInContext = (nodes: readonly unknown[], blockId: string): PageDocumentNodeShape | null => {
  const found = findHeldBlock(nodes, blockId, null);
  if (found === null) return null;
  const { holder, node } = found;
  if (holder === null || !PAGE_BLOCK_ITEM_TYPES.includes(node.type)) return node;
  const { id: _holderId, ...holderAttrs } = holder.attrs ?? {};
  return { ...holder, attrs: holderAttrs, content: [node] };
};

/** Cuts between blocks and always takes at least one, even oversized, so the next part advances. */
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
