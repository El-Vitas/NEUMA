import type { Node as EditorNode, ResolvedPos } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import type { PageEditorBlockLocation } from '../types/pages.editor.nesting.types';

const holdsBlockChildren = (node: EditorNode): boolean =>
  node.type.name === 'doc' || node.type.name === 'block_children';

const findBlockLocation = (resolvedPosition: ResolvedPos): PageEditorBlockLocation | null => {
  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    const parent = resolvedPosition.node(depth - 1);
    if (!holdsBlockChildren(parent)) continue;
    return { depth, index: resolvedPosition.index(depth - 1), node: resolvedPosition.node(depth), parent };
  }
  return null;
};

const appendToNestedBlock = (nestedBlock: EditorNode, block: EditorNode): EditorNode => {
  const children = nestedBlock.lastChild;
  if (children === null) return nestedBlock;
  return nestedBlock.copy(
    nestedBlock.content.replaceChild(nestedBlock.childCount - 1, children.copy(children.content.addToEnd(block))),
  );
};

const wrapAsNestedBlock = (
  previousBlock: EditorNode,
  block: EditorNode,
  schemaOwner: EditorNode,
): EditorNode | null => {
  const nestedBlockType = schemaOwner.type.schema.nodes.nested_block;
  const blockChildrenType = schemaOwner.type.schema.nodes.block_children;
  if (nestedBlockType === undefined || blockChildrenType === undefined) return null;
  if (previousBlock.type === nestedBlockType) return appendToNestedBlock(previousBlock, block);
  return nestedBlockType.create(null, [previousBlock, blockChildrenType.create(null, [block])]);
};

export const indentPageEditorBlock: Command = (state, dispatch) => {
  const location = findBlockLocation(state.selection.$from);
  if (location === null || location.index === 0) return false;
  const previousBlock = location.parent.child(location.index - 1);
  const merged = wrapAsNestedBlock(previousBlock, location.node, location.node);
  if (merged === null) return false;
  if (dispatch === undefined) return true;

  const blockStart = state.selection.$from.before(location.depth);
  const blockEnd = state.selection.$from.after(location.depth);
  const previousStart = blockStart - previousBlock.nodeSize;
  const cursorOffset = state.selection.from - blockStart;
  const transaction = state.tr.replaceWith(previousStart, blockEnd, merged);
  const restoredCursor = transaction.doc.resolve(
    Math.min(previousStart + merged.nodeSize - location.node.nodeSize + cursorOffset, transaction.doc.content.size),
  );
  transaction.setSelection(Selection.near(restoredCursor));
  dispatch(transaction.scrollIntoView());
  return true;
};

export const outdentPageEditorBlock: Command = (state, dispatch) => {
  const location = findBlockLocation(state.selection.$from);
  if (location === null || location.parent.type.name !== 'block_children') return false;
  const resolvedPosition = state.selection.$from;
  const nestedBlockDepth = location.depth - 2;
  if (nestedBlockDepth < 0) return false;
  const nestedBlock = resolvedPosition.node(nestedBlockDepth);
  const parentBlock = nestedBlock.firstChild;
  if (nestedBlock.type.name !== 'nested_block' || parentBlock === null) return false;
  if (dispatch === undefined) return true;

  const nestedStart = resolvedPosition.before(nestedBlockDepth);
  const nestedEnd = resolvedPosition.after(nestedBlockDepth);
  const transaction =
    location.parent.childCount === 1
      ? state.tr.replaceWith(nestedStart, nestedEnd, [parentBlock, location.node])
      : state.tr
          .delete(resolvedPosition.before(location.depth), resolvedPosition.after(location.depth))
          .insert(state.tr.mapping.map(nestedEnd), location.node);
  const liftedStart = transaction.doc.resolve(
    Math.min(nestedStart + parentBlock.nodeSize + 1, transaction.doc.content.size),
  );
  transaction.setSelection(Selection.near(liftedStart));
  dispatch(transaction.scrollIntoView());
  return true;
};

export const splitOutOfNestedBlock: Command = (state, dispatch) => {
  const resolvedPosition = state.selection.$from;
  if (!state.selection.empty) return false;
  const parentDepth = resolvedPosition.depth - 1;
  if (parentDepth < 0) return false;
  const parent = resolvedPosition.node(parentDepth);
  if (parent.type.name !== 'nested_block' || resolvedPosition.index(parentDepth) !== 0) return false;
  if (resolvedPosition.parentOffset !== resolvedPosition.parent.content.size) return false;
  const paragraphType = state.schema.nodes.paragraph;
  if (paragraphType === undefined) return false;
  if (dispatch === undefined) return true;

  const insertAt = resolvedPosition.after(parentDepth);
  const transaction = state.tr.insert(insertAt, paragraphType.create());
  transaction.setSelection(Selection.near(transaction.doc.resolve(insertAt + 1)));
  dispatch(transaction.scrollIntoView());
  return true;
};
