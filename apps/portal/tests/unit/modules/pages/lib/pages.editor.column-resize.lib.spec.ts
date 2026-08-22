import { describe, expect, it } from 'bun:test';
import {
  readPageEditorColumnWidths,
  resizePageEditorColumns,
} from '@/modules/pages/editor/blocks/lib/pages.editor.column-resize.lib';

describe('sharing the width of a row between its columns', () => {
  it('gives every column an equal share when none has a width of its own', () => {
    expect(readPageEditorColumnWidths([null, null])).toEqual([0.5, 0.5]);
    expect(readPageEditorColumnWidths([null, null, null]).map((width) => Number(width.toFixed(2)))).toEqual([
      0.33, 0.33, 0.33,
    ]);
  });

  it('keeps the shares it was given, adding up to the whole row', () => {
    const widths = readPageEditorColumnWidths([0.7, 0.3]);

    expect(widths).toEqual([0.7, 0.3]);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(1);
  });
});

describe('dragging the divider between two columns', () => {
  it('takes width from one neighbour and gives it to the other', () => {
    const widths = resizePageEditorColumns({ boundaryIndex: 0, pointerRatio: 0.7, widths: [0.5, 0.5] });

    expect(widths[0]).toBeCloseTo(0.7);
    expect(widths[1]).toBeCloseTo(0.3);
  });

  it('leaves the other columns of the row untouched', () => {
    const widths = resizePageEditorColumns({ boundaryIndex: 1, pointerRatio: 0.75, widths: [0.3, 0.3, 0.4] });

    expect(widths[0]).toBeCloseTo(0.3);
    expect(widths[1] + widths[2]).toBeCloseTo(0.7);
  });

  it('refuses to squeeze a column out of sight', () => {
    const squeezed = resizePageEditorColumns({ boundaryIndex: 0, pointerRatio: 0.01, widths: [0.5, 0.5] });
    const stretched = resizePageEditorColumns({ boundaryIndex: 0, pointerRatio: 0.99, widths: [0.5, 0.5] });

    expect(squeezed[0]).toBeGreaterThan(0.1);
    expect(stretched[1]).toBeGreaterThan(0.1);
  });

  it('does nothing when the divider is not between two columns', () => {
    expect(resizePageEditorColumns({ boundaryIndex: 5, pointerRatio: 0.5, widths: [0.5, 0.5] })).toEqual([0.5, 0.5]);
  });
});
