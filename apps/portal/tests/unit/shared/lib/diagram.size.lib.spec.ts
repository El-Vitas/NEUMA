import { describe, expect, it } from 'bun:test';
import { readDrawnHeight, readDrawnWidth, showTheDrawingAtItsSize } from '@/shared/lib/diagram.size.lib';

const drawingOf = (viewBox: string): HTMLElement => {
  const drawing = document.createElement('div');
  drawing.innerHTML = `<svg viewBox="${viewBox}" width="100%" style="max-width: 500px"></svg>`;
  return drawing;
};

describe('how wide a drawing was drawn', () => {
  it('reads the width out of the box the drawing was drawn inside', () => {
    expect(readDrawnWidth('0 0 1858.4 94')).toBe(1858.4);
    expect(readDrawnWidth('  0   0   640   480  ')).toBe(640);
  });

  it('says nothing about a drawing that never said how wide it is', () => {
    expect(readDrawnWidth(null)).toBe(0);
    expect(readDrawnWidth('0 0')).toBe(0);
    expect(readDrawnWidth('0 0 ancho alto')).toBe(0);
  });
});

describe('how tall a drawing was drawn', () => {
  it('reads the height out of the same box, and nothing when it does not say', () => {
    expect(readDrawnHeight('0 0 1858.4 94')).toBe(94);
    expect(readDrawnHeight('0 0 640')).toBe(0);
  });
});

/**
 * Squeezed into the column a diagram is drawn at a fraction of its size and
 * stops being readable long before it stops being wide, so it is shown at the
 * size it was drawn at, times however much closer it has been brought.
 */
describe('the size a drawing is shown at', () => {
  it('shows it at the size it was drawn, and lets it be brought closer', () => {
    const drawing = drawingOf('0 0 1200 400');

    showTheDrawingAtItsSize(drawing);
    expect(drawing.querySelector('svg')?.style.width).toBe('1200px');
    expect(drawing.querySelector('svg')?.style.maxWidth).toBe('none');

    showTheDrawingAtItsSize(drawing, 1.5);
    expect(drawing.querySelector('svg')?.style.width).toBe('1800px');
  });

  it('leaves alone a drawing that never said how wide it is', () => {
    const drawing = drawingOf('0 0');

    expect(showTheDrawingAtItsSize(drawing)).toBe(false);
    expect(drawing.querySelector('svg')?.style.width).toBe('');
  });
});
