import type { Command, EditorState } from 'prosemirror-state';
import {
  PAGE_EDITOR_CODE_INDENT,
  PAGE_EDITOR_CODE_LEADING_SPACES_PATTERN,
  PAGE_EDITOR_CODE_TYPE,
} from '../../blocks/constants/pages.editor.blocks.constants';

const isWritingCode = (state: EditorState): boolean => state.selection.$from.parent.type.name === PAGE_EDITOR_CODE_TYPE;

/** Elsewhere Tab nests the block under the previous one; inside code it must only indent text. */
export const indentPageEditorCode: Command = (state, dispatch) => {
  if (!isWritingCode(state)) return false;
  if (dispatch === undefined) return true;
  dispatch(state.tr.insertText(PAGE_EDITOR_CODE_INDENT).scrollIntoView());
  return true;
};

/** Width is capped at one indent step so outdenting never leaves half a step behind. */
const readLineIndent = (state: EditorState): { readonly at: number; readonly width: number } => {
  const { $from } = state.selection;
  const written = $from.parent.textContent;
  const lineStart = written.lastIndexOf('\n', $from.parentOffset - 1) + 1;
  const indent = PAGE_EDITOR_CODE_LEADING_SPACES_PATTERN.exec(written.slice(lineStart))?.[0].length ?? 0;
  return { at: $from.start() + lineStart, width: Math.min(indent, PAGE_EDITOR_CODE_INDENT.length) };
};

export const outdentPageEditorCode: Command = (state, dispatch) => {
  if (!isWritingCode(state)) return false;
  const indent = readLineIndent(state);
  if (indent.width === 0) return false;
  if (dispatch === undefined) return true;
  dispatch(state.tr.delete(indent.at, indent.at + indent.width).scrollIntoView());
  return true;
};
