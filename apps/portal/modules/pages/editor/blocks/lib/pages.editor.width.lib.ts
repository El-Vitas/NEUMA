import {
  PAGE_EDITOR_BLOCK_MINIMUM_WIDTH,
  PAGE_EDITOR_BLOCK_RESIZE_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_BLOCK_UNSIZED_WIDTH,
  PAGE_EDITOR_BLOCK_WIDTH_FRAME_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorWidthFrame } from '../types/pages.editor.width.types';

/** How much of the page a block takes. A block nobody sized takes all of it. */
export const readPageBlockWidth = (width: unknown): number =>
  typeof width === 'number' && width > 0 && width <= 1 ? width : 1;

/**
 * Lets the right edge of a block be dragged, and hands over the width it was
 * left at as a share of the room around it rather than in pixels, so a block
 * reads the same on a screen it was never sized on.
 *
 * Nothing is handed over when the edge was taken hold of and let go without
 * moving: a click is not a resize, and saving one would write a width onto
 * every block anyone ever touched.
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
 * Puts something on the page inside a frame that can be taken by its right edge
 * and stretched.
 *
 * The frame carries the width and the block fills it, so a block nobody sized
 * hugs whatever it came in at while a block that was sized answers to the
 * column of writing around it — which is the only thing a share of the page can
 * mean. The edge sits on the frame, so it is found beside the block rather than
 * far off at the margin.
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
