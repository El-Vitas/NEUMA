import { createCollaborationDocumentName, sanitizeCollaborationPresenceIdentity } from '@company-brain/shared';
import type { StatesArray } from '@hocuspocus/provider';
import { EditorState } from 'prosemirror-state';
import { initProseMirrorDoc, yCursorPlugin, ySyncPlugin } from 'y-prosemirror';
import {
  COLLABORATION_RECONNECT_BASE_DELAY_MS,
  COLLABORATION_RECONNECT_MAX_DELAY_MS,
} from '../constants/pages.collaboration.constants';
import type {
  CollaborationStatus,
  PageCollaborationParticipant,
  PageCollaborationSession,
} from '../types/pages.collaboration.types';
import { createPageEditorPlugins } from './pages.editor.commands';
import { pageEditorSchema } from './pages.editor.schema';

export { createCollaborationDocumentName };

export const computeCollaborationReconnectDelayMs = (attemptNumber: number): number => {
  const clampedAttempt = Math.max(attemptNumber, 1);
  const exponentialDelay = COLLABORATION_RECONNECT_BASE_DELAY_MS * 2 ** (clampedAttempt - 1);
  return Math.min(exponentialDelay, COLLABORATION_RECONNECT_MAX_DELAY_MS);
};

export const createCollaborativePageEditorState = (
  session: PageCollaborationSession,
  selectBlockLabel: string,
  insertBlockLabel: string = selectBlockLabel,
): EditorState => {
  const initializedDocument = initProseMirrorDoc(session.fragment, pageEditorSchema);
  const awareness = session.provider.awareness;
  const collaborationPlugins =
    awareness === null ? [ySyncPlugin(session.fragment)] : [ySyncPlugin(session.fragment), yCursorPlugin(awareness)];
  return EditorState.create({
    doc: initializedDocument.doc,
    plugins: [
      ...createPageEditorPlugins(pageEditorSchema, selectBlockLabel, insertBlockLabel),
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
