import { redo, undo } from 'prosemirror-history';
import type { Command } from 'prosemirror-state';

/** The editor's own history: changes from others arrive as remote steps and stay outside it, mapped over. */
export const undoPageEditorStep: Command = undo;

export const redoPageEditorStep: Command = redo;
