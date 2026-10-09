import { type Node as EditorNode, Fragment, type NodeRange } from 'prosemirror-model';
import type { Command, EditorState, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

/** Nothing, unless removal would empty a container that cannot be empty (the page), which keeps a block. */
const readReplacement = (state: EditorState, range: NodeRange): Fragment | null => {
  if (range.parent.canReplace(range.startIndex, range.endIndex)) return Fragment.empty;
  const paragraph: EditorNode | undefined = state.schema.nodes.paragraph?.createAndFill() ?? undefined;
  if (paragraph === undefined) return null;
  const replacement = Fragment.from(paragraph);
  return range.parent.canReplace(range.startIndex, range.endIndex, replacement) ? replacement : null;
};

/** A single step, so one undo restores the whole run. */
const removePageBlockRange = (
  state: EditorState,
  range: NodeRange,
  dispatch: ((transaction: Transaction) => void) | undefined,
): boolean => {
  const replacement = readReplacement(state, range);
  if (replacement === null) return false;
  if (dispatch === undefined) return true;

  const transaction = state.tr.replaceWith(range.start, range.end, replacement);
  transaction.setSelection(
    Selection.near(transaction.doc.resolve(Math.min(range.start, transaction.doc.content.size))),
  );
  dispatch(transaction.scrollIntoView());
  return true;
};

export const deletePageEditorBlocks: Command = (state, dispatch) => {
  const range = findSelectedPageBlocks(state);
  return range !== null && removePageBlockRange(state, range, dispatch);
};

const findUntouched = (document: EditorNode, block: EditorNode): number | null => {
  let found: number | null = null;
  document.descendants((node, position) => {
    if (found === null && node === block) found = position;
    return found === null;
  });
  return found;
};

const findStillTogether = (document: EditorNode, blocks: readonly EditorNode[]): NodeRange | null => {
  const [first] = blocks;
  const start = first === undefined ? null : findUntouched(document, first);
  if (start === null) return null;
  const size = blocks.reduce((total, block) => total + block.nodeSize, 0);
  const range = document.resolve(start).blockRange(document.resolve(start + size));
  if (range === null || range.endIndex - range.startIndex !== blocks.length) return null;
  const isTogether = blocks.every((block, offset) => range.parent.maybeChild(range.startIndex + offset) === block);
  return isTogether ? range : null;
};

/** Blocks edited in transit are kept, so at worst both pages hold them. */
export const createDeleteSentPageBlocksCommand =
  (blocks: readonly EditorNode[]): Command =>
  (state, dispatch) => {
    const range = findStillTogether(state.doc, blocks);
    return range !== null && removePageBlockRange(state, range, dispatch);
  };
