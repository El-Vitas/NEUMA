import { type Node as EditorNode, Fragment, type NodeRange } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { NodeSelection, Selection } from 'prosemirror-state';
import {
  PAGE_EDITOR_BLOCK_CHILDREN_TYPE,
  PAGE_EDITOR_NESTED_BLOCK_TYPE,
  PAGE_EDITOR_PAGE_TYPE,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorNestingTypes } from '../types/pages.editor.nesting.types';

const holdsBlockChildren = (node: EditorNode): boolean =>
  node.type.name === PAGE_EDITOR_PAGE_TYPE || node.type.name === PAGE_EDITOR_BLOCK_CHILDREN_TYPE;

const readNestingTypes = (state: EditorState): PageEditorNestingTypes | null => {
  const blockChildren = state.schema.nodes[PAGE_EDITOR_BLOCK_CHILDREN_TYPE];
  const nestedBlock = state.schema.nodes[PAGE_EDITOR_NESTED_BLOCK_TYPE];
  return blockChildren === undefined || nestedBlock === undefined ? null : { blockChildren, nestedBlock };
};

/**
 * The blocks a nesting gesture applies to: every block the selection covers,
 * which is one block when there is only a cursor and the whole run when
 * several are selected.
 *
 * `holdsThem` decides how far out the reading goes, so a cursor inside a quote
 * or a table cell nests the quote or the table — the block that actually sits
 * on the page — instead of the paragraph it is typing in.
 */
const findSelectedBlocks = (state: EditorState, holdsThem: (node: EditorNode) => boolean): NodeRange | null =>
  state.selection.$from.blockRange(state.selection.$to, holdsThem);

const keepSelectionOn = (
  transaction: ReturnType<EditorState['tr']['setSelection']> extends never ? never : EditorState['tr'],
  landedAt: number,
  offsetInBlocks: number,
): void => {
  const landed = Math.min(landedAt + offsetInBlocks, transaction.doc.content.size);
  transaction.setSelection(Selection.near(transaction.doc.resolve(landed)));
};

const nestUnder = (previousBlock: EditorNode, blocks: Fragment, types: PageEditorNestingTypes): EditorNode => {
  if (previousBlock.type !== types.nestedBlock) {
    return types.nestedBlock.createChecked(null, [previousBlock, types.blockChildren.createChecked(null, blocks)]);
  }
  const children = previousBlock.lastChild;
  if (children === null) return previousBlock;
  return previousBlock.copy(
    previousBlock.content.replaceChild(previousBlock.childCount - 1, children.copy(children.content.append(blocks))),
  );
};

/**
 * Nests the selected blocks under the block right above them.
 *
 * It works on whatever is selected rather than on the cursor's own block, so a
 * run of blocks nests in one go and a block with nothing to write in — an
 * image, a table — nests just the same.
 */
export const indentPageEditorBlock: Command = (state, dispatch) => {
  const range = findSelectedBlocks(state, holdsBlockChildren);
  const types = readNestingTypes(state);
  if (range === null || types === null || range.startIndex === 0) return false;

  const previousBlock = range.parent.child(range.startIndex - 1);
  const blocks = state.doc.slice(range.start, range.end).content;
  if (blocks.childCount === 0) return false;
  const merged = nestUnder(previousBlock, blocks, types);
  if (dispatch === undefined) return true;

  const previousStart = range.start - previousBlock.nodeSize;
  const offsetInBlocks = state.selection.from - range.start;
  const transaction = state.tr.replaceWith(previousStart, range.end, merged);
  keepSelectionOn(transaction, previousStart + merged.nodeSize - 2 - blocks.size, offsetInBlocks);
  dispatch(transaction.scrollIntoView());
  return true;
};

const rebuildWithoutLifted = (
  nestedBlock: EditorNode,
  liftedFrom: number,
  liftedTo: number,
  types: PageEditorNestingTypes,
): readonly EditorNode[] => {
  const parentBlock = nestedBlock.firstChild;
  const children = nestedBlock.lastChild;
  if (parentBlock === null || children === null) return [];
  const remaining = children.children.filter((_child, index) => index < liftedFrom || index >= liftedTo);
  if (remaining.length === 0) return [parentBlock];
  return [
    nestedBlock.copy(Fragment.from([parentBlock, types.blockChildren.createChecked(null, Fragment.from(remaining))])),
  ];
};

/**
 * Takes the selected blocks out of what they are nested in, leaving them right
 * after it. A nesting left with no children stops being one.
 */
export const outdentPageEditorBlock: Command = (state, dispatch) => {
  const types = readNestingTypes(state);
  if (types === null) return false;
  const range = findSelectedBlocks(state, (node) => node.type === types.blockChildren);
  if (range === null) return false;

  const nestedDepth = range.depth - 1;
  if (nestedDepth < 0) return false;
  const nestedBlock = range.$from.node(nestedDepth);
  if (nestedBlock.type !== types.nestedBlock) return false;
  if (dispatch === undefined) return true;

  const lifted = state.doc.slice(range.start, range.end).content;
  const nestedStart = range.$from.before(nestedDepth);
  const kept = rebuildWithoutLifted(nestedBlock, range.startIndex, range.endIndex, types);
  const keptSize = kept.reduce((size, block) => size + block.nodeSize, 0);

  const transaction = state.tr.replaceWith(nestedStart, nestedStart + nestedBlock.nodeSize, [
    ...kept,
    ...lifted.content,
  ]);
  keepSelectionOn(transaction, nestedStart + keptSize, state.selection.from - range.start);
  dispatch(transaction.scrollIntoView());
  return true;
};

/**
 * Deletes the block others hang from without taking them down with it: the
 * nesting dissolves and its children stay on the page, where they can be seen.
 *
 * Left to the editor's own deletion, the head would be replaced by an empty
 * block and the page would keep a nesting with nothing at its head — the
 * children still there, but hanging from nothing.
 */
export const deletePageEditorBlockKeepingChildren: Command = (state, dispatch) => {
  const types = readNestingTypes(state);
  if (types === null || !(state.selection instanceof NodeSelection)) return false;

  const head = state.selection.$from;
  if (head.parent.type !== types.nestedBlock || head.index() !== 0) return false;
  const children = head.parent.lastChild;
  if (children === null) return false;
  if (dispatch === undefined) return true;

  const nestingStart = head.before();
  const transaction = state.tr.replaceWith(nestingStart, nestingStart + head.parent.nodeSize, children.content);
  transaction.setSelection(Selection.near(transaction.doc.resolve(nestingStart)));
  dispatch(transaction.scrollIntoView());
  return true;
};

export const splitOutOfNestedBlock: Command = (state, dispatch) => {
  const resolvedPosition = state.selection.$from;
  if (!state.selection.empty) return false;
  const parentDepth = resolvedPosition.depth - 1;
  if (parentDepth < 0) return false;
  const parent = resolvedPosition.node(parentDepth);
  if (parent.type.name !== PAGE_EDITOR_NESTED_BLOCK_TYPE || resolvedPosition.index(parentDepth) !== 0) return false;
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
