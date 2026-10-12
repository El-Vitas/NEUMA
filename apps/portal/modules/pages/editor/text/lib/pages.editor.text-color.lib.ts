import type { PageBlockColor } from '@neuma/shared';
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

export const readPageTextColor = (state: EditorState, kind: PageEditorBlockColorKind): string | null => {
  const mark = readTheMark(kind);
  const { $from, empty, from } = state.selection;
  const carried = (empty ? (state.storedMarks ?? $from.marks()) : state.doc.resolve(from + 1).marks()).find(
    (one) => one.type === mark,
  );
  const color: unknown = carried?.attrs.color;
  return typeof color === 'string' ? color : null;
};

export const readPageTextColors = (state: EditorState): PageEditorBlockColors => ({
  background: readPageTextColor(state, 'background'),
  text: readPageTextColor(state, 'text'),
});

/** Colors the selected text as a mark and removes it when `color` is null; whole-block color is a separate menu. */
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
