import type { Command } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

/** Copies get fresh ids, so a link to one never opens the other. */
export const duplicatePageEditorBlock: Command = (state, dispatch) => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return false;

  const blocks = state.doc.slice(range.start, range.end).content;
  if (blocks.childCount === 0) return false;
  if (dispatch === undefined) return true;

  const transaction = state.tr.insert(range.end, blocks);
  transaction.setSelection(Selection.near(transaction.doc.resolve(range.end + 1)));
  dispatch(transaction.scrollIntoView());
  return true;
};
