import { sanitizeCollaborationPresenceIdentity } from '@company-brain/shared';
import type { StatesArray } from '@hocuspocus/provider';
import { EditorState } from 'prosemirror-state';
import { initProseMirrorDoc, yCursorPlugin, ySyncPlugin, yUndoPlugin } from 'y-prosemirror';
import {
  COLLABORATION_RECONNECT_BASE_DELAY_MS,
  COLLABORATION_RECONNECT_MAX_DELAY_MS,
} from '../constants/pages.collaboration.constants';
import type {
  CollaborationStatus,
  PageCollaborationDraft,
  PageCollaborationParticipant,
} from '../types/pages.collaboration.types';
import { createPageEditorPlugins } from './pages.editor.commands';
import { pageEditorSchema } from './pages.editor.schema';

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
