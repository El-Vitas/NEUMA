import type { PageFileDisplay } from '@neuma/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_FILE_TYPE } from '../../blocks/constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from '../../blocks/lib/pages.editor.block-range.lib';
import { readPageFileShape, showsPageFileInPlace } from './pages.editor.file.lib';

/** Returns `null` for files the browser cannot render in place, so no useless display choice is offered. */
const findSelectedFile = (
  state: EditorState,
): { readonly position: number; readonly shown: PageFileDisplay } | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const node = range.parent.child(range.startIndex);
  if (node.type.name !== PAGE_EDITOR_FILE_TYPE) return null;
  if (!showsPageFileInPlace(node.attrs.caption, node.attrs.mimeType)) return null;
  return {
    position: range.start,
    shown: readPageFileShape(node.attrs.display, node.attrs.caption, node.attrs.mimeType),
  };
};

/** Reports the effective display, not the stored one, which may be unset. */
export const readPageFileDisplay = (state: EditorState): { readonly chosen: PageFileDisplay } | null => {
  const file = findSelectedFile(state);
  return file === null ? null : { chosen: file.shown };
};

export const createPageFileDisplayCommand =
  (display: PageFileDisplay): Command =>
  (state, dispatch) => {
    const file = findSelectedFile(state);
    if (file === null) return false;
    if (dispatch === undefined) return true;
    dispatch(state.tr.setNodeAttribute(file.position, 'display', display));
    return true;
  };
