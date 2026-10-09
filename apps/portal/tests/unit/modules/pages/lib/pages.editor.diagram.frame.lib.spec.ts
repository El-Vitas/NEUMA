import { describe, expect, it } from 'bun:test';
import { attachPageDiagramFrame } from '@/modules/pages/editor/media/lib/pages.editor.diagram.frame.lib';

const createFrame = (height: number) => {
  const drawing = document.createElement('div');
  drawing.getBoundingClientRect = () => DOMRect.fromRect({ height, width: 600 });
  const written: (number | null)[] = [];
  const frame = attachPageDiagramFrame({
    drawing,
    hint: 'Arrastra o usa las flechas',
    label: 'Alto del marco',
    writeHeight: (asked) => written.push(asked),
  });
  return { frame, written };
};

const press = (handle: HTMLElement, key: string): void => {
  handle.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
};

describe('the edge a diagram frame is resized by', () => {
  it('is named for what it is, with how to use it said apart', () => {
    const { frame } = createFrame(300);

    expect(frame.handle.getAttribute('aria-label')).toBe('Alto del marco');
    expect(frame.handle.getAttribute('aria-description')).toBe('Arrastra o usa las flechas');
  });

  it('says the height the frame has once the drawing is in it, in pixels', () => {
    const { frame } = createFrame(312.4);

    frame.refresh();

    expect(frame.handle.getAttribute('aria-valuenow')).toBe('312');
    expect(frame.handle.getAttribute('aria-valuetext')).toBe('312 px');
  });

  it('grows and shrinks with the arrows, and goes back to the automatic size with Enter', () => {
    const { frame, written } = createFrame(300);

    press(frame.handle, 'ArrowDown');
    press(frame.handle, 'ArrowUp');
    press(frame.handle, 'Enter');

    expect(written).toEqual([340, 260, null]);
  });

  // Heights below the frame minimum and half a pixel above the drawing must not count as a resize either.
  it.each([300, 99.6, 312.4])('writes nothing when the edge of a %p px drawing is clicked without moving', (height) => {
    const { frame, written } = createFrame(height);
    frame.handle.setPointerCapture = () => undefined;

    frame.handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientY: 100 }));
    frame.handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientY: 100 }));

    expect(written).toEqual([]);
  });

  it('writes the height the frame was dragged to', () => {
    const { frame, written } = createFrame(300);
    frame.handle.setPointerCapture = () => undefined;

    frame.handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientY: 100 }));
    frame.handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientY: 180 }));

    expect(written).toEqual([380]);
  });
});
