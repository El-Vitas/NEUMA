import { describe, expect, it } from 'bun:test';
import {
  describePieSlicePath,
  readChartPointsPath,
  readChartSeries,
  readChartSlices,
  readChartTopValue,
} from '@/modules/pages/collections/lib/pages.chart.lib';
import { toCalculationItemId } from '@/modules/pages/collections/lib/pages.query-aggregates.lib';
import type { PageSchemaProperty, PageViewAggregates } from '@/modules/pages/collections/types/pages.schema.types';
import { defaultConfig } from './pages.options.fixture';

const statusProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'status',
  label: 'Status',
  options: [
    { color: 'BLUE', group: null, id: 'todo', value: 'Todo' },
    { color: 'GREEN', group: null, id: 'done', value: 'Done' },
  ],
  required: false,
  type: 'SELECT',
};

const aggregates: PageViewAggregates = {
  calculations: {},
  distinctRowCount: 3,
  groupCalculations: {
    done: { [toCalculationItemId('amount', 'SUM')]: 4 },
    todo: { [toCalculationItemId('amount', 'SUM')]: 11 },
  },
  groupCounts: { done: 1, todo: 2, unassigned: 0 },
};

const seriesOf = (measure: 'AVERAGE' | 'COUNT' | 'SUM', valueProperty: null | string) =>
  readChartSeries({
    aggregates,
    groupBy: statusProperty,
    measure,
    mode: 'OPTION',
    statusGroupLabel: (group) => group,
    valueProperty,
  });

describe('lo que dibuja un gráfico', () => {
  it('counts the rows of each group the database counted when nothing else was asked', () => {
    expect(seriesOf('COUNT', null)).toEqual([
      { color: 'BLUE', key: 'todo', label: 'Todo', value: 2 },
      { color: 'GREEN', key: 'done', label: 'Done', value: 1 },
      { color: null, key: 'unassigned', label: '', value: 0 },
    ]);
  });

  it('adds up the property the database calculated instead of counting rows', () => {
    expect(seriesOf('SUM', 'amount').map((point) => point.value)).toEqual([11, 4, 0]);
  });

  it('falls back to counting when no property was chosen to measure', () => {
    expect(seriesOf('SUM', null).map((point) => point.value)).toEqual([2, 1, 0]);
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
