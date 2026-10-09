import { describe, expect, it } from 'bun:test';
import {
  describePieSlicePath,
  readChartPointsPath,
  readChartSeries,
  readChartSlices,
  readChartTopValue,
} from '@/modules/pages/collections/lib/pages.chart.lib';
import type { PageSchemaProperty, PageViewGroup } from '@/modules/pages/collections/types/pages.schema.types';

const amount: PageSchemaProperty = {
  key: 'amount',
  label: 'Amount',
  options: null,
  required: false,
  type: 'NUMBER',
};

const rowWith = (id: string, value: number | undefined): PageViewGroup['rows'][number] => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  propertyValues: value === undefined ? null : { amount: value },
  spaceId: 'space',
  title: id,
});

const groups: readonly PageViewGroup[] = [
  { color: 'BLUE', key: 'todo', label: 'Todo', rows: [rowWith('a', 3), rowWith('b', 8)] },
  { color: 'GREEN', key: 'done', label: 'Done', rows: [rowWith('c', 4)] },
  { color: null, key: 'none', label: 'Sin asignar', rows: [] },
];

describe('lo que dibuja un gráfico', () => {
  it('counts the rows of each group when nothing else was asked', () => {
    expect(readChartSeries(groups, 'COUNT', null, [amount])).toEqual([
      { color: 'BLUE', key: 'todo', label: 'Todo', value: 2 },
      { color: 'GREEN', key: 'done', label: 'Done', value: 1 },
      { color: null, key: 'none', label: 'Sin asignar', value: 0 },
    ]);
  });

  it('adds up the chosen property instead of counting rows', () => {
    expect(readChartSeries(groups, 'SUM', 'amount', [amount]).map((point) => point.value)).toEqual([11, 4, 0]);
  });

  it('falls back to counting when the chosen property is gone', () => {
    expect(readChartSeries(groups, 'SUM', 'missing', [amount]).map((point) => point.value)).toEqual([2, 1, 0]);
  });
});

describe('cuánto mide el eje', () => {
  it('reaches the tallest value there is', () => {
    expect(readChartTopValue([3, 11, 4])).toBe(11);
  });

  it('never reads as zero, so nothing divides by nothing', () => {
    expect(readChartTopValue([0, 0])).toBe(1);
    expect(readChartTopValue([])).toBe(1);
  });
});

describe('la línea', () => {
  it('draws one point per value, left to right and floor to ceiling', () => {
    expect(readChartPointsPath([0, 5, 10], 10, 100, 100)).toBe('0,100 50,50 100,0');
  });

  it('draws a single value in the middle instead of dividing by nothing', () => {
    expect(readChartPointsPath([5], 10, 100, 100)).toBe('50,50');
  });
});

describe('el pastel', () => {
  it('gives each slice the part of the round it is worth', () => {
    expect(readChartSlices([3, 1]).map((slice) => Math.round(slice.sweep))).toEqual([270, 90]);
  });

  it('has no slices when there is nothing to share out', () => {
    expect(readChartSlices([0, 0])).toEqual([]);
  });

  it('describes an arc that starts where the one before ended', () => {
    const [first, second] = readChartSlices([1, 1]);

    expect(first?.from).toBe(0);
    expect(second?.from).toBe(first?.sweep);
  });

  it('writes a path that draws an arc', () => {
    expect(describePieSlicePath({ from: 0, sweep: 90 }, 50)).toContain('A');
  });

  it('draws a lone slice as the whole round', () => {
    expect(describePieSlicePath({ from: 0, sweep: 360 }, 50)).toContain('A');
  });
});
