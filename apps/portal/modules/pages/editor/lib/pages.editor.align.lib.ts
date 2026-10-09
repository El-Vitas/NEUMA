import type { PageBlockAlignment } from '@neuma/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_ALIGNABLE_TYPES, PAGE_EDITOR_FILE_TYPE } from '../blocks/constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from '../blocks/lib/pages.editor.block-range.lib';
import { readPageFileShape } from '../media/lib/pages.editor.file.lib';

/** A file is alignable only when shown as a document, not as a download line. */
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

export const readPageBlockAlignment = (state: EditorState): { readonly chosen: string | null } | null => {
  const block = findSelectedAlignable(state);
  if (block === null) return null;
  return { chosen: typeof block.align === 'string' ? block.align : null };
};

/** Full width is stored as left alignment plus full room, so narrowing a full-width block does not make it jump. */
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
