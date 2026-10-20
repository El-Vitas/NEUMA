import { redo as redoOwnStep, undo as undoOwnStep } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import { redoCommand as redoSharedStep, undoCommand as undoSharedStep, yUndoPluginKey } from 'y-prosemirror';

/**
 * Collaborative pages use the shared history, which knows who wrote what. A page on the block channel has no shared
 * document, so it falls to the editor's own history: changes from others stay outside it and are mapped over.
 */
const isWrittenTogether = (state: EditorState): boolean => yUndoPluginKey.getState(state) !== undefined;

/** Undoes only this person's last change, never another collaborator's. */
export const undoPageEditorStep: Command = (state, dispatch, view) =>
  isWrittenTogether(state) ? undoSharedStep(state, dispatch, view) : undoOwnStep(state, dispatch, view);

export const redoPageEditorStep: Command = (state, dispatch, view) =>
  isWrittenTogether(state) ? redoSharedStep(state, dispatch, view) : redoOwnStep(state, dispatch, view);
