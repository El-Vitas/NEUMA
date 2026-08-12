import type { Command, EditorState } from 'prosemirror-state';
import { Plugin as EditorPlugin, NodeSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';
import { pageEditorBlockMenuKey } from './pages.editor.plugin-keys.lib';

/** Where the block whose actions are on offer starts, or nothing when the menu is closed. */
export const readPageEditorBlockMenuTarget = (state: EditorState): number | null =>
  pageEditorBlockMenuKey.getState(state) ?? null;

export const closePageEditorBlockMenu = (view: EditorView): void => {
  if (readPageEditorBlockMenuTarget(view.state) === null) return;
  view.dispatch(view.state.tr.setMeta(pageEditorBlockMenuKey, null));
};

/**
 * Opens the actions of the block starting at `blockStart`, selecting it first
 * so what the menu offers and what the page shows as chosen are the same block.
 */
export const openPageEditorBlockMenuAt = (view: EditorView, blockStart: number): void => {
  if (blockStart < 0 || blockStart >= view.state.doc.content.size) return;
  const block = view.state.doc.nodeAt(blockStart);
  if (block === null) return;
  const transaction = view.state.tr.setSelection(NodeSelection.create(view.state.doc, blockStart));
  view.dispatch(transaction.setMeta(pageEditorBlockMenuKey, blockStart));
};

/** Opens the actions of the block the selection is on, so the menu is reachable without a pointer. */
export const openPageEditorBlockMenu: Command = (state, dispatch) => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return false;
  if (dispatch === undefined) return true;

  dispatch(state.tr.setMeta(pageEditorBlockMenuKey, range.start));
  return true;
};

/**
 * Remembers which block was asked about.
 *
 * The menu closes on its own as soon as the page changes underneath it, so it
 * can never act on a block that is no longer where it was.
 */
export const createPageEditorBlockMenuPlugin = (): EditorPlugin<number | null> =>
  new EditorPlugin<number | null>({
    key: pageEditorBlockMenuKey,
    state: {
      apply: (transaction, previousTarget) => {
        const target: unknown = transaction.getMeta(pageEditorBlockMenuKey);
        if (target === undefined) return transaction.docChanged ? null : previousTarget;
        return typeof target === 'number' ? target : null;
      },
      init: () => null,
    },
  });
