import { describe, expect, it } from 'bun:test';
import {
  findNeighbourRowId,
  readRowDropSide,
  resolveRowDropAnchor,
  resolveRowStepAnchor,
} from '@/modules/pages/collections/lib/pages.row-ordering.lib';

describe('dónde cae una fila al soltarla sobre otra', () => {
  it('goes before the row it was dropped on when the pointer is in its upper half', () => {
    expect(resolveRowDropAnchor('row-3', 'BEFORE')).toEqual({ before: 'row-3' });
  });

  it('goes after the row it was dropped on when the pointer is in its lower half', () => {
    expect(resolveRowDropAnchor('row-3', 'AFTER')).toEqual({ after: 'row-3' });
  });

  it('tells which half of the row the pointer is in', () => {
    expect(readRowDropSide(110, { height: 40, top: 100 })).toBe('BEFORE');
    expect(readRowDropSide(139, { height: 40, top: 100 })).toBe('AFTER');
    expect(readRowDropSide(120, { height: 40, top: 100 })).toBe('AFTER');
  });
});

describe('las filas que tiene al lado', () => {
  const buildRows = (): HTMLElement[] => {
    const body = document.createElement('tbody');
    const rows = [
      ['row-1', 'a'],
      ['spacer', ''],
      ['row-2', 'b'],
      ['row-3', 'a'],
    ].map(([id, scope]) => {
      const row = document.createElement('tr');
      if (id !== 'spacer') row.dataset.rowId = id;
      row.dataset.scope = scope;
      body.append(row);
      return row;
    });
    return rows;
  };

  it('finds the next row of the same group, skipping what is not a row and rows of other groups', () => {
    const [first, , , third] = buildRows();

    expect(findNeighbourRowId(first as HTMLElement, 'DOWN', 'a')).toBe('row-3');
    expect(findNeighbourRowId(third as HTMLElement, 'UP', 'a')).toBe('row-1');
  });

  it('finds nothing past the last row of its group', () => {
    const [first, , , third] = buildRows();

    expect(findNeighbourRowId(first as HTMLElement, 'UP', 'a')).toBeNull();
    expect(findNeighbourRowId(third as HTMLElement, 'DOWN', 'a')).toBeNull();
  });
});

describe('subir y bajar una fila con el teclado', () => {
  it('goes before the row above', () => {
    expect(resolveRowStepAnchor('UP', 'row-1', 'row-3')).toEqual({ before: 'row-1' });
  });

  it('goes after the row below', () => {
    expect(resolveRowStepAnchor('DOWN', 'row-1', 'row-3')).toEqual({ after: 'row-3' });
  });

  it('stays where it is when there is no row on that side', () => {
    expect(resolveRowStepAnchor('UP', null, 'row-2')).toBeNull();
    expect(resolveRowStepAnchor('DOWN', 'row-2', null)).toBeNull();
  });
});
