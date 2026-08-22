import type { PageFileDisplay } from '@company-brain/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_FILE_TYPE } from '../../blocks/constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from '../../blocks/lib/pages.editor.block-range.lib';
import { readPageFileShape, showsPageFileInPlace } from './pages.editor.file.lib';

/**
 * The selected file, when there is a choice to make about it.
 *
 * A file the browser cannot draw has none: offering to show a spreadsheet as a
 * document would be offering something that never happens, and a menu that does
 * nothing is worse than a menu that is not there.
 */
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

/** How the selected file is shown, so the menu says what is in use rather than what was written down. */
export const readPageFileDisplay = (state: EditorState): { readonly chosen: PageFileDisplay } | null => {
  const file = findSelectedFile(state);
  return file === null ? null : { chosen: file.shown };
};

/** Shows the selected file the way it was asked to be shown. */
export const createPageFileDisplayCommand =
  (display: PageFileDisplay): Command =>
  (state, dispatch) => {
    const file = findSelectedFile(state);
    if (file === null) return false;
    if (dispatch === undefined) return true;
    dispatch(state.tr.setNodeAttribute(file.position, 'display', display));
    return true;
  };
