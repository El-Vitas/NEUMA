import type { PageBlockColor } from '@neuma/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_COLOR_ATTRS } from '../../text/constants/pages.editor.colors.constants';
import type { PageEditorBlockColorKind, PageEditorBlockColors } from '../types/pages.editor.block-color.types';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

export const readPageEditorBlockColor = (state: EditorState, kind: PageEditorBlockColorKind): string | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const firstBlock = range.parent.child(range.startIndex);
  const color: unknown = firstBlock.attrs[PAGE_EDITOR_COLOR_ATTRS[kind]];
  return typeof color === 'string' ? color : null;
};

export const readPageEditorBlockColors = (state: EditorState): PageEditorBlockColors => ({
  background: readPageEditorBlockColor(state, 'background'),
  text: readPageEditorBlockColor(state, 'text'),
});

/** The colour is set on the blocks, not their text, so it survives edits and moves. */
export const createPageEditorBlockColorCommand =
  (kind: PageEditorBlockColorKind, color: PageBlockColor | null): Command =>
  (state, dispatch) => {
    const range = findSelectedPageBlocks(state);
    if (range === null) return false;
    if (dispatch === undefined) return true;

    const transaction = state.tr;
    for (let position = range.start; position < range.end; ) {
      const block = state.doc.nodeAt(position);
      if (block === null) break;
      transaction.setNodeAttribute(position, PAGE_EDITOR_COLOR_ATTRS[kind], color);
      position += block.nodeSize;
    }
    dispatch(transaction.scrollIntoView());
    return true;
  };
