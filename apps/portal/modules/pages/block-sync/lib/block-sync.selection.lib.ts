import type { Node as EditorNode } from 'prosemirror-model';
import { type EditorState, NodeSelection, TextSelection, type Transaction } from 'prosemirror-state';
import type { BlockChangedRange, BlockFoundNode, BlockSelectionAnchor } from '../types/block-sync.types';

const readBlockId = (node: EditorNode): string | null => (typeof node.attrs.id === 'string' ? node.attrs.id : null);

const findBlock = (document: EditorNode, blockId: string): BlockFoundNode | null => {
  let found: BlockFoundNode | null = null;
  document.descendants((node, position) => {
    if (found === null && readBlockId(node) === blockId) found = { node, position };
    return found === null;
  });
  return found;
};

const listTextblocks = (document: EditorNode): readonly BlockFoundNode[] => {
  const textblocks: BlockFoundNode[] = [];
  document.descendants((node, position) => {
    if (node.isTextblock && readBlockId(node) !== null) textblocks.push({ node, position });
    return !node.isTextblock;
  });
  return textblocks;
};

/** The deepest block around a position, and how far into it the position is. */
const describeAnchor = (document: EditorNode, position: number): BlockSelectionAnchor | null => {
  const resolved = document.resolve(position);
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    const blockId = readBlockId(resolved.node(depth));
    if (blockId !== null) return { blockId, offset: position - resolved.start(depth) };
  }
  return null;
};

const placeInside = (document: EditorNode, found: BlockFoundNode, offset: number): number =>
  TextSelection.near(document.resolve(found.position + 1 + Math.min(offset, found.node.content.size))).from;

const placeNextToSurvivor = (before: EditorNode, after: EditorNode, position: number): number | null => {
  const textblocks = listTextblocks(before);
  const earlier = textblocks.filter((entry) => entry.position + entry.node.nodeSize <= position).reverse();
  const later = textblocks.filter((entry) => entry.position >= position);
  for (const entry of earlier) {
    const survivor = findBlock(after, readBlockId(entry.node) ?? '');
    if (survivor !== null)
      return TextSelection.near(after.resolve(survivor.position + survivor.node.nodeSize - 1), -1).from;
  }
  for (const entry of later) {
    const survivor = findBlock(after, readBlockId(entry.node) ?? '');
    if (survivor !== null) return TextSelection.near(after.resolve(survivor.position + 1)).from;
  }
  return null;
};

/** Where a position of the old document is in the new one, found by the block it was in, not by how far it was. */
const locate = (before: EditorNode, after: EditorNode, position: number): number | null => {
  const anchor = describeAnchor(before, position);
  const found = anchor === null ? null : findBlock(after, anchor.blockId);
  if (anchor !== null && found !== null) return placeInside(after, found, anchor.offset);
  return placeNextToSurvivor(before, after, position);
};

const isInside = (position: number, range: BlockChangedRange): boolean =>
  position >= range.start && position <= range.currentEnd;

const restoreNodeSelection = (transaction: Transaction, before: EditorState, selection: NodeSelection): Transaction => {
  const blockId = readBlockId(selection.node);
  const found = blockId === null ? null : findBlock(transaction.doc, blockId);
  if (found !== null) return transaction.setSelection(NodeSelection.create(transaction.doc, found.position));
  const position = locate(before.doc, transaction.doc, selection.from);
  return position === null
    ? transaction
    : transaction.setSelection(TextSelection.near(transaction.doc.resolve(position)));
};

/**
 * After a remote change replaced a span, the selection goes back to the block it was in, at the same distance from
 * the start of it. Mapping it through the replacement would send it to the edge of the span, and what is typed next
 * would land in some other block. A block that is gone leaves it at the nearest block that survived.
 */
export const restoreSelectionByBlock = (
  transaction: Transaction,
  before: EditorState,
  range: BlockChangedRange,
): Transaction => {
  if (range.start === range.currentEnd) return transaction;
  const { selection } = before;
  if (selection instanceof NodeSelection) {
    return isInside(selection.from, range) ? restoreNodeSelection(transaction, before, selection) : transaction;
  }
  if (!isInside(selection.anchor, range) && !isInside(selection.head, range)) return transaction;
  const settle = (position: number): number =>
    (isInside(position, range) ? locate(before.doc, transaction.doc, position) : null) ??
    transaction.mapping.map(position);
  const anchor = transaction.doc.resolve(settle(selection.anchor));
  const head = transaction.doc.resolve(settle(selection.head));
  return transaction.setSelection(TextSelection.between(anchor, head));
};
