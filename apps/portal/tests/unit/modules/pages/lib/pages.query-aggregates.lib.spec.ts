import { describe, expect, it } from 'bun:test';
import {
  toCalculationItemId,
  toGroupCountKey,
  toViewAggregates,
} from '@/modules/pages/collections/lib/pages.query-aggregates.lib';
import type { PageQueryResult } from '@/modules/pages/collections/types/pages.query.types';

const resultWith = (counts: PageQueryResult['reducers'][string]): PageQueryResult => ({
  attachedFiles: [],
  reducers: { counts },
  relatedRows: [],
  rows: {},
  spaceId: 'space-1',
  viewVersion: 0,
});

describe('lo que dicen los conteos de una vista', () => {
  it('names a calculation after its property and what it calculates', () => {
    expect(toCalculationItemId('points', 'SUM')).not.toBe(toCalculationItemId('points', 'AVERAGE'));
  });

  it('tells a group of a board with bands by its column and its band together', () => {
    expect(toGroupCountKey('todo', 'urgent')).toBe('todo|urgent');
    expect(toGroupCountKey('todo', null)).toBe('todo');
  });

  it('reads the rows of each group and the calculations of the whole view', () => {
    const aggregates = toViewAggregates(
      resultWith({
        distinctRowCount: 5,
        groups: [
          { key: 'todo', subKey: null, values: { count: 3, [toCalculationItemId('points', 'SUM')]: '7' } },
          { key: 'done', subKey: null, values: { count: 2 } },
        ],
        kind: 'aggregations',
        totals: { count: 5, [toCalculationItemId('points', 'SUM')]: 9 },
      }),
    );

    expect(aggregates).toEqual({
      calculations: { [toCalculationItemId('points', 'SUM')]: 9 },
      distinctRowCount: 5,
      groupCalculations: { done: {}, todo: { [toCalculationItemId('points', 'SUM')]: 7 } },
      groupCounts: { done: 2, todo: 3 },
    });
  });

  it('counts a repeated row once in all, even if a multi-value grouping puts it in two groups', () => {
    const aggregates = toViewAggregates(
      resultWith({
        distinctRowCount: 1,
        groups: [
          { key: 'a', subKey: null, values: { count: 1 } },
          { key: 'b', subKey: null, values: { count: 1 } },
        ],
        kind: 'aggregations',
        totals: { count: 1 },
      }),
    );

    expect(aggregates?.distinctRowCount).toBe(1);
    expect(aggregates?.groupCounts).toEqual({ a: 1, b: 1 });
  });

  it('answers null when the counts could not be read, so the screen does not invent zeros', () => {
    expect(toViewAggregates(null)).toBeNull();
    expect(toViewAggregates({ ...resultWith({ ids: [], kind: 'results', nextCursor: null }) })).toBeNull();
  });
});
