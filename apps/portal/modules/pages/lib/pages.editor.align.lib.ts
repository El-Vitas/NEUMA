import type { PageBlockAlignment } from '@company-brain/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_ALIGNABLE_TYPES, PAGE_EDITOR_FILE_TYPE } from '../constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';
import { readPageFileShape } from './pages.editor.file.lib';

/** A file only stands somewhere once the page draws it; a line to press has nowhere to go. */
const standsSomewhere = (node: EditorNode): boolean =>
  node.type.name === PAGE_EDITOR_FILE_TYPE
    ? readPageFileShape(node.attrs.display, node.attrs.caption, node.attrs.mimeType) === 'document'
    : PAGE_EDITOR_ALIGNABLE_TYPES.includes(node.type.name);

const findSelectedAlignable = (state: EditorState): { readonly align: unknown; readonly position: number } | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const node = range.parent.child(range.startIndex);
  return standsSomewhere(node) ? { align: node.attrs.align, position: range.start } : null;
};

/** Where the selected block stands, so the menu shows what is in use — and nothing for writing. */
export const readPageBlockAlignment = (state: EditorState): { readonly chosen: string | null } | null => {
  const block = findSelectedAlignable(state);
  if (block === null) return null;
  return { chosen: typeof block.align === 'string' ? block.align : null };
};

/**
 * Stands the selected block where it was asked to stand.
 *
 * Standing at full width is standing at the left with all of the room, so the
 * choice sets both: a block chosen to fill the page and then narrowed keeps the
 * side it was left on instead of jumping.
 */
export const createPageBlockAlignmentCommand =
  (align: PageBlockAlignment): Command =>
  (state, dispatch) => {
    const block = findSelectedAlignable(state);
    if (block === null) return false;
    if (dispatch === undefined) return true;
    const transaction = state.tr.setNodeAttribute(block.position, 'align', align === 'full' ? 'left' : align);
    if (align === 'full') transaction.setNodeAttribute(block.position, 'width', 1);
    dispatch(transaction);
    return true;
  };
