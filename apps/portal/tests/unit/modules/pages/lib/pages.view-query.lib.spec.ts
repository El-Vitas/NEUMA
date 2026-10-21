import { describe, expect, it } from 'bun:test';
import { toCalculationItemId } from '@/modules/pages/collections/lib/pages.query-aggregates.lib';
import { buildViewCountsQuery, buildViewRowsQuery } from '@/modules/pages/collections/lib/pages.view-query.lib';
import { buildView } from './pages.views.fixture';

describe('lo que se pide primero a una vista', () => {
  it('asks a table for its first rows by the id of the view, without counting anything', () => {
    const request = buildViewRowsQuery(buildView('Table', 'TABLE'));

    expect(request).toEqual({
      reducers: [{ id: 'rows', kind: 'results', limit: 50 }],
      viewId: 'view-table',
    });
  });

  it('sends the search to the server with the first rows, trimmed, and nothing when it is empty', () => {
    const view = buildView('Table', 'TABLE');

    expect(buildViewRowsQuery(view, '  informe ').search).toBe('informe');
    expect(buildViewRowsQuery(view, '   ')).not.toHaveProperty('search');
    expect(buildViewRowsQuery(view)).not.toHaveProperty('search');
  });

  it('sends the quick filter on top of the view, in the first rows and in the counts', () => {
    const view = buildView('Table', 'TABLE');
    const quickFilter = { kind: 'CONDITION', operator: 'IS', propertyKey: 'owner', value: '@me' } as const;

    expect(buildViewRowsQuery(view, '', quickFilter).quickFilter).toEqual(quickFilter);
    expect(buildViewCountsQuery(view, '', quickFilter).quickFilter).toEqual(quickFilter);
    expect(buildViewRowsQuery(view)).not.toHaveProperty('quickFilter');
    expect(buildViewRowsQuery(view, '', null)).not.toHaveProperty('quickFilter');
  });

  it('asks a board for its first cards of every column', () => {
    const request = buildViewRowsQuery(buildView('Board', 'BOARD', { configuration: { groupBy: 'status' } }));

    expect(request.reducers).toEqual([{ id: 'rows', kind: 'groups', rowsPerGroup: 25 }]);
  });

  it('asks a chart for no rows at all, since it draws counts', () => {
    const request = buildViewRowsQuery(buildView('Chart', 'CHART', { configuration: { groupBy: 'status' } }));

    expect(request.reducers).toEqual([]);
  });

  it('reads a calendar as many rows as one month may hold', () => {
    const request = buildViewRowsQuery(buildView('Calendar', 'CALENDAR'));

    expect(request.reducers).toEqual([{ id: 'rows', kind: 'results', limit: 100 }]);
  });
});

describe('lo que se pide después, con los conteos', () => {
  it('counts the rows of the whole view when it is not grouped', () => {
    const request = buildViewCountsQuery(buildView('Table', 'TABLE'));

    expect(request.reducers).toEqual([
      {
        by: 'NONE',
        id: 'counts',
        items: [{ calculation: 'COUNT_ALL', id: 'count', propertyKey: null }],
        kind: 'aggregations',
      },
    ]);
  });

  it('counts each group of a grouped view, and asks for the calculations the columns chose', () => {
    const request = buildViewCountsQuery(
      buildView('Board', 'BOARD', {
        configuration: { calculations: { points: 'SUM', title: 'NONE' }, groupBy: 'status' },
      }),
    );

    expect(request.reducers).toEqual([
      {
        by: 'GROUP',
        id: 'counts',
        items: [
          { calculation: 'COUNT_ALL', id: 'count', propertyKey: null },
          { calculation: 'SUM', id: toCalculationItemId('points', 'SUM'), propertyKey: 'points' },
        ],
        kind: 'aggregations',
      },
    ]);
  });

  it('asks for the counts of the rows the search lets through, so they agree with the rows', () => {
    const request = buildViewCountsQuery(buildView('Table', 'TABLE'), 'informe');

    expect(request.search).toBe('informe');
  });

  it('asks a chart for the sum of the property it measures, and only that', () => {
    const request = buildViewCountsQuery(
      buildView('Chart', 'CHART', {
        configuration: { chartMeasure: 'SUM', chartValueProperty: 'points', groupBy: 'status' },
      }),
    );

    expect(request.reducers[0]).toMatchObject({
      by: 'GROUP',
      items: [
        { calculation: 'COUNT_ALL', propertyKey: null },
        { calculation: 'SUM', propertyKey: 'points' },
      ],
    });
  });
});
