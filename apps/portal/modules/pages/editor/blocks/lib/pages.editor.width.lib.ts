import {
  PAGE_EDITOR_BLOCK_MINIMUM_WIDTH,
  PAGE_EDITOR_BLOCK_RESIZE_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_BLOCK_UNSIZED_WIDTH,
  PAGE_EDITOR_BLOCK_WIDTH_FRAME_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorWidthFrame } from '../types/pages.editor.width.types';

export const readPageBlockWidth = (width: unknown): number =>
  typeof width === 'number' && width > 0 && width <= 1 ? width : 1;

/**
 * Makes a block's right edge draggable and reports the width as a share of the available room, not pixels.
 * Nothing is reported when the edge was released without moving, so a click never writes a width.
 */
export const dragPageBlockWidth = (
  handle: HTMLElement,
  room: HTMLElement,
  sized: HTMLElement,
  saveWidth: (width: number) => void,
): void => {
  handle.addEventListener('mousedown', (start) => {
    start.preventDefault();
    const available = room.getBoundingClientRect().width;
    const from = sized.getBoundingClientRect().width;
    if (available === 0) return;
    let left: number | null = null;

    const follow = (move: MouseEvent): void => {
      const wanted = (from + move.clientX - start.clientX) / available;
      left = Math.min(Math.max(wanted, PAGE_EDITOR_BLOCK_MINIMUM_WIDTH), 1);
      sized.style.width = `${String(Math.round(left * 100))}%`;
    };
    const settle = (): void => {
      handle.ownerDocument.removeEventListener('mousemove', follow);
      handle.ownerDocument.removeEventListener('mouseup', settle);
      if (left !== null) saveWidth(left);
    };

    handle.ownerDocument.addEventListener('mousemove', follow);
    handle.ownerDocument.addEventListener('mouseup', settle);
  });
};

/**
 * Wraps content in a frame whose right edge can be dragged.
 * The frame carries the width and the block fills it, so a sized block is relative to the writing column.
 */
export const framePageBlockWidth = (
  block: HTMLElement,
  room: HTMLElement,
  resizeLabel: string,
  saveWidth: (width: number) => void,
): PageEditorWidthFrame => {
  const frame = document.createElement('div');
  const handle = document.createElement('button');

  frame.className = PAGE_EDITOR_BLOCK_WIDTH_FRAME_STYLE_CLASS;
  handle.type = 'button';
  handle.className = PAGE_EDITOR_BLOCK_RESIZE_HANDLE_STYLE_CLASS;
  handle.dataset.blockHandle = 'true';
  handle.setAttribute('aria-label', resizeLabel);
  frame.append(block, handle);
  dragPageBlockWidth(handle, room, frame, saveWidth);

  return {
    frame,
    handle,
    showWidth: (width) => {
      frame.style.width =
        typeof width === 'number'
          ? `${String(Math.round(readPageBlockWidth(width) * 100))}%`
          : PAGE_EDITOR_BLOCK_UNSIZED_WIDTH;
    },
  };
};
