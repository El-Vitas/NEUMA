import { sanitizeCollaborationPresenceIdentity } from '@company-brain/shared';
import type { StatesArray } from '@hocuspocus/provider';
import { EditorState, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { initProseMirrorDoc, yCursorPlugin, ySyncPlugin, yUndoPlugin } from 'y-prosemirror';
import type { Doc } from 'yjs';
import {
  COLLABORATION_RECONNECT_BASE_DELAY_MS,
  COLLABORATION_RECONNECT_MAX_DELAY_MS,
} from '../constants/pages.collaboration.constants';
import { createPageEditorPlugins } from '../editor/lib/pages.editor.commands';
import { pageEditorSchema } from '../editor/lib/pages.editor.schema';
import type {
  CollaborationStatus,
  PageCollaborationDraft,
  PageCollaborationParticipant,
} from '../types/pages.collaboration.types';

export const computeCollaborationReconnectDelayMs = (attemptNumber: number): number => {
  const clampedAttempt = Math.max(attemptNumber, 1);
  const exponentialDelay = COLLABORATION_RECONNECT_BASE_DELAY_MS * 2 ** (clampedAttempt - 1);
  return Math.min(exponentialDelay, COLLABORATION_RECONNECT_MAX_DELAY_MS);
};

/** Undo history is the shared document's: undo reverts only this person's changes, not other people's. */
export const createCollaborativePageEditorState = (
  page: PageCollaborationDraft,
  selectBlockLabel: string,
  insertBlockLabel: string = selectBlockLabel,
  writeHereLabel = '',
  foldHeadingLabel = '',
  resizeColumnLabel: string = selectBlockLabel,
): EditorState => {
  const initializedDocument = initProseMirrorDoc(page.fragment, pageEditorSchema);
  const collaborationPlugins = [
    ySyncPlugin(page.fragment),
    yUndoPlugin(),
    ...(page.awareness === null ? [] : [yCursorPlugin(page.awareness)]),
  ];
  return EditorState.create({
    doc: initializedDocument.doc,
    plugins: [
      ...createPageEditorPlugins(
        pageEditorSchema,
        selectBlockLabel,
        insertBlockLabel,
        resizeColumnLabel,
        selectBlockLabel,
        writeHereLabel,
        foldHeadingLabel,
      ),
      ...collaborationPlugins,
    ],
    schema: pageEditorSchema,
  });
};

const readBrowserSelection = (view: EditorView): { readonly anchor: number; readonly head: number } | null => {
  const selection = view.dom.ownerDocument.getSelection();
  if (!view.hasFocus() || selection?.anchorNode == null || selection.focusNode == null) return null;
  if (!view.dom.contains(selection.anchorNode) || !view.dom.contains(selection.focusNode)) return null;
  return {
    anchor: view.posAtDOM(selection.anchorNode, selection.anchorOffset),
    head: view.posAtDOM(selection.focusNode, selection.focusOffset),
  };
};

/** A recent click is in the browser selection before the editor state has it. */
export const readWhereThisPersonWrites = (view: EditorView): { readonly anchor: number; readonly head: number } =>
  readBrowserSelection(view) ?? { anchor: view.state.selection.anchor, head: view.state.selection.head };

const isInsideWriting = (view: EditorView, position: number): boolean =>
  position >= 0 && position <= view.state.doc.content.size && view.state.doc.resolve(position).parent.inlineContent;

/**
 * Applies the browser caret to the editor before a remote change lands, so a click the editor has not read yet
 * is not overwritten by the stale caret. Remote caret moves count as changes too.
 * Must be set up before the collaborative state: listeners fire in registration order. Returns a disposer.
 */
export const keepClicksAcrossChangesFromOthers = (
  view: EditorView,
  document: Doc,
  awareness: PageCollaborationDraft['awareness'],
): (() => void) => {
  const readPendingClick = (): void => {
    if (view.isDestroyed) return;
    const clicked = readBrowserSelection(view);
    if (clicked === null) return;
    const { selection } = view.state;
    if (selection.anchor === clicked.anchor && selection.head === clicked.head) return;
    if (!isInsideWriting(view, clicked.anchor) || !isInsideWriting(view, clicked.head)) return;
    view.dispatch(
      view.state.tr
        .setSelection(TextSelection.create(view.state.doc, clicked.anchor, clicked.head))
        .setMeta('addToHistory', false),
    );
  };
  document.on('beforeAllTransactions', readPendingClick);
  awareness?.on('change', readPendingClick);
  return () => {
    document.off('beforeAllTransactions', readPendingClick);
    awareness?.off('change', readPendingClick);
  };
};

/** Restores the caret when the editor is rebuilt around the same document, as after a reconnection. */
export const restoreSelectionIfStillWriting = (view: EditorView, anchor: number, head: number): void => {
  if (!isInsideWriting(view, anchor) || !isInsideWriting(view, head)) return;
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, anchor, head)).setMeta('addToHistory', false),
  );
};

export const getCollaborationStatusLabelKey = (status: CollaborationStatus): string => `collaboration.${status}`;

export const mapAwarenessStatesToParticipants = (
  states: StatesArray,
  localClientId: number,
): readonly PageCollaborationParticipant[] =>
  states
    .filter((state) => state.clientId !== localClientId)
    .map((state) => ({
      clientId: state.clientId,
      cursor: state.cursor ?? null,
      ...sanitizeCollaborationPresenceIdentity(state.user),
    }));
