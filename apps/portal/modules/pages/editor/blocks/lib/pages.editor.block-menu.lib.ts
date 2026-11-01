import type { Command, EditorState } from 'prosemirror-state';
import { Plugin as EditorPlugin, NodeSelection, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { pageEditorBlockMenuKey } from '../../lib/pages.editor.plugin-keys.lib';
import type { PageEditorBlockRequest, PageEditorBlockRequestKind } from '../types/pages.editor.block-request.types';
import { findPageBlockAround, findSelectedPageBlocks } from './pages.editor.block-range.lib';

const isPageEditorBlockRequest = (value: unknown): value is PageEditorBlockRequest =>
  typeof value === 'object' && value !== null && 'blockStart' in value && 'kind' in value;

export const readPageEditorBlockRequest = (state: EditorState): PageEditorBlockRequest | null =>
  pageEditorBlockMenuKey.getState(state) ?? null;

/** Closes only the given kind: a menu handing over to a dialog closes itself and must not close the dialog. */
export const closePageEditorBlockRequest = (view: EditorView, kind: PageEditorBlockRequestKind): void => {
  if (readPageEditorBlockRequest(view.state)?.kind !== kind) return;
  view.dispatch(view.state.tr.setMeta(pageEditorBlockMenuKey, null));
};

/** Selects the block first so the request and the visible selection are the same block. */
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

/** Leaves the selection alone: reselecting one block on the way out would drop the rest. */
export const changePageEditorBlockRequest = (view: EditorView, kind: PageEditorBlockRequestKind): void => {
  const request = readPageEditorBlockRequest(view.state);
  if (request === null) return;
  view.dispatch(view.state.tr.setMeta(pageEditorBlockMenuKey, { ...request, kind }));
};

/** Keeps the text selection, since that fragment is what the comment points at. */
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

/** Also moves the cursor to `place`, so the dialog and the selection refer to the same block. */
export const openPageEditorBlockCommentsAt = (view: EditorView, place: number, discussionId?: string): void => {
  const range = findPageBlockAround(view.state.doc.resolve(place));
  if (range === null) return;

  const transaction = view.state.tr.setSelection(TextSelection.create(view.state.doc, place));
  view.dispatch(
    transaction.setMeta(pageEditorBlockMenuKey, {
      blockStart: range.start,
      ...(discussionId === undefined ? {} : { discussionId }),
      kind: 'comments',
    }),
  );
};

export const openPageEditorBlockMenu: Command = (state, dispatch) => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return false;
  if (dispatch === undefined) return true;

  dispatch(state.tr.setMeta(pageEditorBlockMenuKey, { blockStart: range.start, kind: 'actions' }));
  return true;
};

/** The request is dropped when the document changes, so it never lands on a block that has moved. */
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
