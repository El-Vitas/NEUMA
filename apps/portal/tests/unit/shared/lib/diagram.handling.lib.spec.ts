import { describe, expect, it } from 'bun:test';
import { letTheDrawingBeHandled } from '@/shared/lib/diagram.handling.lib';

const drawingOf = (viewBox: string): HTMLElement => {
  const drawing = document.createElement('div');
  drawing.innerHTML = `<svg viewBox="${viewBox}"></svg>`;
  return drawing;
};

/** The test page builds a wheel event without the key held with it, so the key is set on the event itself. */
const turnTheWheelCloser = (drawing: HTMLElement): void => {
  const turn = new WheelEvent('wheel', { cancelable: true, deltaY: -1 });
  Object.defineProperty(turn, 'ctrlKey', { value: true });
  drawing.dispatchEvent(turn);
};

describe('letTheDrawingBeHandled', () => {
  it('brings a drawing closer with the buttons and the wheel, and says how close it is each time', () => {
    const told: number[] = [];
    const drawing = drawingOf('0 0 400 200');
    const handling = letTheDrawingBeHandled(drawing, (zoom) => told.push(zoom));

    handling.zoomBy(2);
    turnTheWheelCloser(drawing);
    handling.showActualSize();

    expect(told).toEqual([2, 2.2, 1]);
    expect(drawing.querySelector('svg')?.style.width).toBe('400px');
  });

  /** Drawn again by a page that re-renders, a drawing left holding on would be brought closer twice per turn. */
  it('stops answering the wheel once it is let go of', () => {
    const told: number[] = [];
    const drawing = drawingOf('0 0 400 200');
    const handling = letTheDrawingBeHandled(drawing, (zoom) => told.push(zoom));

    handling.release();
    turnTheWheelCloser(drawing);

    expect(told).toEqual([]);
  });
});
