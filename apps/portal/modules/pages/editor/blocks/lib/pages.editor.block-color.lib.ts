import type { PageBlockColor } from '@company-brain/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_COLOR_ATTRS } from '../../text/constants/pages.editor.colors.constants';
import type { PageEditorBlockColorKind, PageEditorBlockColors } from '../types/pages.editor.block-color.types';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

/** The colour the selected blocks already carry, so the menu can show what is in use. */
export const readPageEditorBlockColor = (state: EditorState, kind: PageEditorBlockColorKind): string | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const firstBlock = range.parent.child(range.startIndex);
  const color: unknown = firstBlock.attrs[PAGE_EDITOR_COLOR_ATTRS[kind]];
  return typeof color === 'string' ? color : null;
};

/** Both colours of the selected blocks, as the menu needs them. */
export const readPageEditorBlockColors = (state: EditorState): PageEditorBlockColors => ({
  background: readPageEditorBlockColor(state, 'background'),
  text: readPageEditorBlockColor(state, 'text'),
});

/**
 * Paints the selected blocks, or takes the colour off when given none.
 *
 * The colour lands on the blocks themselves rather than on their text, so it
 * survives editing what they say and travels with them when they move.
 */
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
