import type { Command, EditorState } from 'prosemirror-state';
import {
  PAGE_EDITOR_CODE_INDENT,
  PAGE_EDITOR_CODE_LEADING_SPACES_PATTERN,
  PAGE_EDITOR_CODE_TYPE,
} from '../../blocks/constants/pages.editor.blocks.constants';

const isWritingCode = (state: EditorState): boolean => state.selection.$from.parent.type.name === PAGE_EDITOR_CODE_TYPE;

/**
 * Tab inside code writes a step of indentation.
 *
 * Everywhere else on a page Tab hangs a block from the one above it, but code
 * is written in columns rather than in blocks, and a key that took the writing
 * out of the block would leave the page altogether.
 */
export const indentPageEditorCode: Command = (state, dispatch) => {
  if (!isWritingCode(state)) return false;
  if (dispatch === undefined) return true;
  dispatch(state.tr.insertText(PAGE_EDITOR_CODE_INDENT).scrollIntoView());
  return true;
};

/**
 * Where the line being written starts, and how much of a step sits in front of
 * it — never more than a step, so half of one is not left behind.
 */
const readLineIndent = (state: EditorState): { readonly at: number; readonly width: number } => {
  const { $from } = state.selection;
  const written = $from.parent.textContent;
  const lineStart = written.lastIndexOf('\n', $from.parentOffset - 1) + 1;
  const indent = PAGE_EDITOR_CODE_LEADING_SPACES_PATTERN.exec(written.slice(lineStart))?.[0].length ?? 0;
  return { at: $from.start() + lineStart, width: Math.min(indent, PAGE_EDITOR_CODE_INDENT.length) };
};

/**
 * Shift+Tab takes a step of indentation off the line being written, wherever
 * the cursor stands on it, and does nothing to a line already at the margin.
 */
export const outdentPageEditorCode: Command = (state, dispatch) => {
  if (!isWritingCode(state)) return false;
  const indent = readLineIndent(state);
  if (indent.width === 0) return false;
  if (dispatch === undefined) return true;
  dispatch(state.tr.delete(indent.at, indent.at + indent.width).scrollIntoView());
  return true;
};
