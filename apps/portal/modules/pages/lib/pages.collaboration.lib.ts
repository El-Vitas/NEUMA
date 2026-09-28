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

/**
 * The page as it is written together.
 *
 * What is being written is the shared document, so the history is the shared
 * document's too: undoing takes back what this person did and leaves what
 * everyone else did where it is. Undoing and redoing ask which history is in
 * charge, so the same keys and the same menu answer on a page written alone
 * and on one written with others.
 */
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

/** Where the browser has the caret right now, as positions of the page, or nothing when it is not in the page's writing. */
const readBrowserSelection = (view: EditorView): { readonly anchor: number; readonly head: number } | null => {
  const selection = view.dom.ownerDocument.getSelection();
  if (!view.hasFocus() || selection?.anchorNode == null || selection.focusNode == null) return null;
  if (!view.dom.contains(selection.anchorNode) || !view.dom.contains(selection.focusNode)) return null;
  return {
    anchor: view.posAtDOM(selection.anchorNode, selection.anchorOffset),
    head: view.posAtDOM(selection.focusNode, selection.focusOffset),
  };
};

/**
 * Where this person is writing, read before the page is set up again.
 *
 * A click that landed a moment ago is in the browser and not yet in the
 * editor, whose caret still sits at the top of the page. Setting the page up
 * from that caret sent the first keystrokes into the first paragraph, beside
 * whoever was writing there.
 */
export const readWhereThisPersonWrites = (view: EditorView): { readonly anchor: number; readonly head: number } =>
  readBrowserSelection(view) ?? { anchor: view.state.selection.anchor, head: view.state.selection.head };

const isInsideWriting = (view: EditorView, position: number): boolean =>
  position >= 0 && position <= view.state.doc.content.size && view.state.doc.resolve(position).parent.inlineContent;

/**
 * Brings a click the editor has not read yet into the editor, before a change
 * from somebody else is applied.
 *
 * The browser moves the caret the moment somebody clicks, and the editor reads
 * it a moment later. A change arriving from somebody else in between is applied
 * around the caret the editor still remembers, so the click was lost and the
 * next keystrokes landed where the caret used to be — often beside whoever was
 * typing. Reading the browser's caret first, before the shared document
 * remembers where this person was, keeps the click.
 *
 * Somebody else only moving their caret is such a change too. Drawing their
 * caret writes the page again, and with it the caret the editor remembers, over
 * the click the browser had not reported yet.
 *
 * It has to be set up before the collaborative state, so it runs first: the
 * document and the presence tell whoever listens in the order they started
 * listening. Returns how to stop.
 */
export const keepClicksAcrossChangesFromOthers = (
  view: EditorView,
  document: Doc,
  awareness: PageCollaborationDraft['awareness'],
): (() => void) => {
  const readPendingClick = (): void => {
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

/**
 * Puts the caret back where it was, when the page is set up again around the
 * same document — as after a reconnection — so the writing goes on where it
 * was going instead of jumping to the top.
 */
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
