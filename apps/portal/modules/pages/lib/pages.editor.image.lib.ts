import type { PageImageAlignment } from '@company-brain/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_FILE_INPUT_SELECTOR, PAGE_EDITOR_IMAGE_TYPE } from '../constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

const findSelectedImage = (state: EditorState): { readonly align: unknown; readonly position: number } | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const node = range.parent.child(range.startIndex);
  return node.type.name === PAGE_EDITOR_IMAGE_TYPE ? { align: node.attrs.align, position: range.start } : null;
};

/**
 * Asks for the image to put on the page.
 *
 * A picture cannot be written, so the menu opens the same chooser the clip
 * opens rather than pretending to insert something: what lands on the page is
 * whatever comes back from it.
 */
export const askForPageImage: Command = (_state, _dispatch, view) => {
  const input = view?.dom.ownerDocument.querySelector<HTMLInputElement>(PAGE_EDITOR_FILE_INPUT_SELECTOR);
  if (input === null || input === undefined) return false;
  input.click();
  return true;
};

/** How much of the page an image takes. An image nobody sized takes all of it. */
export const readPageImageWidth = (width: unknown): number =>
  typeof width === 'number' && width > 0 && width <= 1 ? width : 1;

/** Where the selected image stands, so the menu shows what is in use — and nothing for other blocks. */
export const readPageImageAlignment = (state: EditorState): { readonly chosen: string | null } | null => {
  const image = findSelectedImage(state);
  if (image === null) return null;
  return { chosen: typeof image.align === 'string' ? image.align : null };
};

/**
 * Stands the selected image where it was asked to stand.
 *
 * Standing at full width is standing at the left with all of the room, so the
 * choice sets both: an image chosen to fill the page and then narrowed keeps
 * the side it was left on instead of jumping.
 */
export const createPageImageAlignmentCommand =
  (align: PageImageAlignment): Command =>
  (state, dispatch) => {
    const image = findSelectedImage(state);
    if (image === null) return false;
    if (dispatch === undefined) return true;
    const transaction = state.tr.setNodeAttribute(image.position, 'align', align === 'full' ? 'left' : align);
    if (align === 'full') transaction.setNodeAttribute(image.position, 'width', 1);
    dispatch(transaction);
    return true;
  };
