import { describe, expect, it } from 'bun:test';
import { keepDiagramZoomWithinReach, measureDiagramFitZoom } from '@/shared/lib/diagram.zoom.lib';

describe('how close a drawing can be brought', () => {
  it('stays between the smallest and the largest it is worth reading at', () => {
    expect(keepDiagramZoomWithinReach(1.5)).toBe(1.5);
    expect(keepDiagramZoomWithinReach(0.01)).toBe(0.25);
    expect(keepDiagramZoomWithinReach(40)).toBe(4);
  });
});

describe('how close a drawing is brought to fit its frame', () => {
  it('shrinks a drawing larger than its frame until the side that overflows most fits', () => {
    expect(measureDiagramFitZoom({ height: 1300, width: 1860 }, { height: 650, width: 930 })).toBe(0.5);
    expect(measureDiagramFitZoom({ height: 400, width: 2000 }, { height: 800, width: 1000 })).toBe(0.5);
  });

  it('brings a small drawing closer until it fills its frame, no closer than the most it can be brought', () => {
    expect(measureDiagramFitZoom({ height: 100, width: 200 }, { height: 400, width: 800 })).toBe(4);
    expect(measureDiagramFitZoom({ height: 100, width: 200 }, { height: 150, width: 800 })).toBe(1.5);
  });

  it('leaves at its size a drawing that never said how big it is', () => {
    expect(measureDiagramFitZoom({ height: 0, width: 0 }, { height: 400, width: 800 })).toBe(1);
  });
});
