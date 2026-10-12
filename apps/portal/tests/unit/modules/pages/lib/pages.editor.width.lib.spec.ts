import { describe, expect, it } from 'bun:test';
import { dragPageBlockWidth, readPageBlockWidth } from '@/modules/pages/editor/blocks/lib/pages.editor.width.lib';

const measuring = (element: HTMLElement, width: number): HTMLElement => {
  element.getBoundingClientRect = () => ({ width }) as DOMRect;
  return element;
};

const dragging = (from: number, to: number): { readonly saved: number[]; readonly shown: string } => {
  const room = measuring(document.createElement('div'), 500);
  const sized = measuring(document.createElement('div'), 200);
  const handle = document.createElement('button');
  const saved: number[] = [];
  room.append(sized, handle);
  document.body.append(room);
  dragPageBlockWidth(handle, room, sized, (width) => saved.push(width));

  handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: from }));
  document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: to }));
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  const shown = sized.style.width;
  room.remove();
  return { saved, shown };
};

describe('how wide something on a page is left', () => {
  it('keeps the width as a share of the room it sits in', () => {
    expect(dragging(100, 150)).toEqual({ saved: [0.5], shown: '50%' });
  });

  it('refuses to be narrowed away to nothing', () => {
    expect(dragging(100, -400).saved).toEqual([0.1]);
  });

  it('leaves the width alone when the edge was never moved, and stops following after', () => {
    const room = measuring(document.createElement('div'), 500);
    const sized = measuring(document.createElement('div'), 200);
    const handle = document.createElement('button');
    const saved: number[] = [];
    dragPageBlockWidth(handle, room, sized, (width) => saved.push(width));

    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 400 }));

    expect(saved).toEqual([]);
    expect(sized.style.width).toBe('');
  });
});

describe('readPageBlockWidth', () => {
  it('gives all of the room to something nobody sized', () => {
    expect(readPageBlockWidth(undefined)).toBe(1);
    expect(readPageBlockWidth(0)).toBe(1);
    expect(readPageBlockWidth(2)).toBe(1);
    expect(readPageBlockWidth(0.4)).toBe(0.4);
  });
});
