import { redo as redoOwnStep, undo as undoOwnStep } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import { redoCommand as redoSharedStep, undoCommand as undoSharedStep, yUndoPluginKey } from 'y-prosemirror';

/**
 * Whether the page is being written together, which is what decides whose
 * history answers: the one kept by this screen, or the one kept by the shared
 * document, which knows who wrote what.
 */
const isWrittenTogether = (state: EditorState): boolean => yUndoPluginKey.getState(state) !== undefined;

/**
 * Takes back the last thing this person did.
 *
 * On a page written with others that is not the same as the last thing that
 * happened: the shared history is asked, so undoing never reaches into someone
 * else's writing.
 */
export const undoPageEditorStep: Command = (state, dispatch, view) =>
  isWrittenTogether(state) ? undoSharedStep(state, dispatch, view) : undoOwnStep(state, dispatch, view);

/** Puts back what this person took back, asked of the same history that answered the undo. */
export const redoPageEditorStep: Command = (state, dispatch, view) =>
  isWrittenTogether(state) ? redoSharedStep(state, dispatch, view) : redoOwnStep(state, dispatch, view);
