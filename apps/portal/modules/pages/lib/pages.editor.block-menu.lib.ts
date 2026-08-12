import type { Command, EditorState } from 'prosemirror-state';
import { Plugin as EditorPlugin, NodeSelection, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { PageEditorBlockRequest, PageEditorBlockRequestKind } from '../types/pages.editor.block-request.types';
import { findPageBlockAround, findSelectedPageBlocks } from './pages.editor.block-range.lib';
import { pageEditorBlockMenuKey } from './pages.editor.plugin-keys.lib';

const isPageEditorBlockRequest = (value: unknown): value is PageEditorBlockRequest =>
  typeof value === 'object' && value !== null && 'blockStart' in value && 'kind' in value;

/** What is being asked of which block, or nothing while the page is left alone. */
export const readPageEditorBlockRequest = (state: EditorState): PageEditorBlockRequest | null =>
  pageEditorBlockMenuKey.getState(state) ?? null;

/**
 * Puts away what was being asked, and only that.
 *
 * A menu that hands the block over to a conversation — its comments, where it
 * is going — closes itself right after; naming what is being closed keeps that
 * farewell from taking the conversation with it.
 */
export const closePageEditorBlockRequest = (view: EditorView, kind: PageEditorBlockRequestKind): void => {
  if (readPageEditorBlockRequest(view.state)?.kind !== kind) return;
  view.dispatch(view.state.tr.setMeta(pageEditorBlockMenuKey, null));
};

/**
 * Asks something of the block starting at `blockStart`, selecting it first so
 * what is being answered and what the page shows as chosen are the same block.
 */
export const openPageEditorBlockRequest = (
  view: EditorView,
  blockStart: number,
  kind: PageEditorBlockRequestKind,
): void => {
  if (blockStart < 0 || blockStart >= view.state.doc.content.size) return;
  if (view.state.doc.nodeAt(blockStart) === null) return;

  const transaction = view.state.tr.setSelection(NodeSelection.create(view.state.doc, blockStart));
  view.dispatch(transaction.setMeta(pageEditorBlockMenuKey, { blockStart, kind }));
};

/**
 * Asks what has been said about the chosen stretch of text.
 *
 * Unlike the questions asked of a whole block, this one leaves the chosen text
 * exactly as it was: it is the fragment being talked about, and losing hold of
 * it would leave the remark with nothing to point at.
 */
export const openPageEditorFragmentComments = (view: EditorView): void => {
  const range = findSelectedPageBlocks(view.state);
  const { from, to } = view.state.selection;
  if (range === null || from === to) return;

  view.dispatch(
    view.state.tr.setMeta(pageEditorBlockMenuKey, {
      blockStart: range.start,
      fragment: { from, to },
      kind: 'comments',
    }),
  );
};

/**
 * Opens what has been said about the block a place in the page belongs to.
 *
 * The place is also taken as the cursor, so what the conversation shows and
 * what the page has hold of are the same block.
 */
export const openPageEditorBlockCommentsAt = (view: EditorView, place: number): void => {
  const range = findPageBlockAround(view.state.doc.resolve(place));
  if (range === null) return;

  const transaction = view.state.tr.setSelection(TextSelection.create(view.state.doc, place));
  view.dispatch(transaction.setMeta(pageEditorBlockMenuKey, { blockStart: range.start, kind: 'comments' }));
};

/** Asks the block the selection is on for its actions, so the menu is reachable without a pointer. */
export const openPageEditorBlockMenu: Command = (state, dispatch) => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return false;
  if (dispatch === undefined) return true;

  dispatch(state.tr.setMeta(pageEditorBlockMenuKey, { blockStart: range.start, kind: 'actions' }));
  return true;
};

/**
 * Remembers what a block was asked.
 *
 * The question is dropped as soon as the page changes underneath it, so an
 * answer can never land on a block that is no longer where it was.
 */
export const createPageEditorBlockMenuPlugin = (): EditorPlugin<PageEditorBlockRequest | null> =>
  new EditorPlugin<PageEditorBlockRequest | null>({
    key: pageEditorBlockMenuKey,
    state: {
      apply: (transaction, previousRequest) => {
        const request: unknown = transaction.getMeta(pageEditorBlockMenuKey);
        if (request === undefined) return transaction.docChanged ? null : previousRequest;
        return isPageEditorBlockRequest(request) ? request : null;
      },
      init: () => null,
    },
  });
