import { type Node as EditorNode, Fragment, type NodeRange } from 'prosemirror-model';
import type { Command, EditorState, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

/**
 * What is left where the blocks were: nothing, unless taking them all out would
 * leave a container that cannot be empty — the page itself — which keeps a
 * block to write in.
 */
const readReplacement = (state: EditorState, range: NodeRange): Fragment | null => {
  if (range.parent.canReplace(range.startIndex, range.endIndex)) return Fragment.empty;
  const paragraph: EditorNode | undefined = state.schema.nodes.paragraph?.createAndFill() ?? undefined;
  if (paragraph === undefined) return null;
  const replacement = Fragment.from(paragraph);
  return range.parent.canReplace(range.startIndex, range.endIndex, replacement) ? replacement : null;
};

/**
 * Takes a run of blocks out, in one step that Ctrl+Z brings back whole — the
 * block, what hangs from it and what it held.
 */
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

/** Removes the blocks the selection covers. */
export const deletePageEditorBlocks: Command = (state, dispatch) => {
  const range = findSelectedPageBlocks(state);
  return range !== null && removePageBlockRange(state, range, dispatch);
};

/** Where the first of some blocks is now, if it is still there untouched. */
const findUntouched = (document: EditorNode, block: EditorNode): number | null => {
  let found: number | null = null;
  document.descendants((node, position) => {
    if (found === null && node === block) found = position;
    return found === null;
  });
  return found;
};

/** Where some blocks sit side by side in the page now, if they are all still there, untouched and together. */
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

/**
 * Removes the blocks that were sent to another page, wherever they are now and
 * whatever is selected. A block somebody changed while they travelled is no
 * longer the one that arrived, so nothing is removed and nothing written is
 * lost: at worst the blocks are in both pages.
 */
export const createDeleteSentPageBlocksCommand =
  (blocks: readonly EditorNode[]): Command =>
  (state, dispatch) => {
    const range = findStillTogether(state.doc, blocks);
    return range !== null && removePageBlockRange(state, range, dispatch);
  };
