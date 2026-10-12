import type { Command, EditorState } from 'prosemirror-state';
import type { PageEditorBlockRange } from '../types/pages.editor.block-drag.types';
import { createPageEditorBlockMoveCommand } from './pages.editor.block-drag.lib';

const findSelectedBlockRange = (state: EditorState): PageEditorBlockRange | null => {
  const range = state.selection.$from.blockRange(state.selection.$to);
  return range === null ? null : { from: range.start, to: range.end };
};

/** The keyboard version of a drag: blocks stay among their own siblings and the swap is one undo step. */
const createPageEditorBlockStepCommand =
  (direction: 'down' | 'up'): Command =>
  (state, dispatch) => {
    const range = findSelectedBlockRange(state);
    if (range === null) return false;

    const neighbourEdge =
      direction === 'up' ? state.doc.resolve(range.from).nodeBefore : state.doc.resolve(range.to).nodeAfter;
    if (neighbourEdge === null) return false;

    const insertAt = direction === 'up' ? range.from - neighbourEdge.nodeSize : range.to + neighbourEdge.nodeSize;
    return createPageEditorBlockMoveCommand({ copy: false, insertAt, range })(state, dispatch);
  };

export const movePageEditorBlockUp: Command = createPageEditorBlockStepCommand('up');

export const movePageEditorBlockDown: Command = createPageEditorBlockStepCommand('down');
