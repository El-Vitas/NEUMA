import type { PageBlockColor } from '@company-brain/shared';
import type { MarkType } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import {
  PAGE_EDITOR_BACKGROUND_COLOR_MARK,
  PAGE_EDITOR_TEXT_COLOR_MARK,
} from '../../blocks/constants/pages.editor.blocks.constants';
import type {
  PageEditorBlockColorKind,
  PageEditorBlockColors,
} from '../../blocks/types/pages.editor.block-color.types';
import { pageEditorSchema } from '../../lib/pages.editor.schema';

const readTheMark = (kind: PageEditorBlockColorKind): MarkType =>
  kind === 'text'
    ? pageEditorSchema.marks[PAGE_EDITOR_TEXT_COLOR_MARK]
    : pageEditorSchema.marks[PAGE_EDITOR_BACKGROUND_COLOR_MARK];

/** The colour the chosen writing already carries, so the menu shows what is in use rather than what is on offer. */
export const readPageTextColor = (state: EditorState, kind: PageEditorBlockColorKind): string | null => {
  const mark = readTheMark(kind);
  const { $from, empty, from } = state.selection;
  const carried = (empty ? (state.storedMarks ?? $from.marks()) : state.doc.resolve(from + 1).marks()).find(
    (one) => one.type === mark,
  );
  const color: unknown = carried?.attrs.color;
  return typeof color === 'string' ? color : null;
};

/** Both colours the chosen writing carries, as the menu needs them. */
export const readPageTextColors = (state: EditorState): PageEditorBlockColors => ({
  background: readPageTextColor(state, 'background'),
  text: readPageTextColor(state, 'text'),
});

/**
 * Paints the chosen writing, or takes the paint off when given no colour.
 *
 * A colour on the writing itself is what somebody means when they choose four
 * words and reach for a colour: painting the whole block would paint what they
 * did not choose. Painting a whole block is a different thing, and it is asked
 * for from the block's own menu.
 */
export const createPageTextColorCommand =
  (kind: PageEditorBlockColorKind, color: PageBlockColor | null): Command =>
  (state, dispatch) => {
    const mark = readTheMark(kind);
    const { empty, from, to } = state.selection;
    if (empty) return false;
    if (dispatch === undefined) return true;

    const transaction = state.tr.removeMark(from, to, mark);
    dispatch(color === null ? transaction : transaction.addMark(from, to, mark.create({ color })));
    return true;
  };
