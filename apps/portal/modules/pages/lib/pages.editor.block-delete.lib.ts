import { type Node as EditorNode, Fragment, type NodeRange } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
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
 * Removes the blocks the selection covers, in one step that Ctrl+Z brings back
 * whole — the block, what hangs from it and what it held.
 */
export const deletePageEditorBlocks: Command = (state, dispatch) => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return false;

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
