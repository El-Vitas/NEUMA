import { describe, expect, it } from 'bun:test';
import type { PagePropertyOption, PagePropertyValues } from '../page-property/page-property.types.js';
import { PAGE_STATUS_GROUP } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { readPageViewConfiguration } from './page-view.schemas.js';
import type {
  PageQueryAggregationsOutcome,
  PageQueryGroupsOutcome,
  PageQueryOutcome,
  PageQueryResultsOutcome,
} from './page-view.query.types.js';
import { listLocalPageCells, listLocalPageRows, runLocalPageQuery } from './page-view.local-query.lib.js';
import type { LocalPageQueryInput, LocalPageQueryRow } from './page-view.local-query.lib.js';
import type { PageViewProperty } from './page-view.types.js';
import { PAGE_FILTER_OPERATOR, PAGE_SORT_DIRECTION, PAGE_VIEW_CALCULATION } from './page-view.types.js';

const option = (id: string, group: PagePropertyOption['group'] = null): PagePropertyOption => ({
  color: null,
  group,
  id,
  value: id,
});

const PROPERTIES: readonly PageViewProperty[] = [
  { key: 'title', type: PAGE_PROPERTY_TYPE.TITLE },
  { key: 'priority', options: [option('low'), option('mid'), option('high')], type: PAGE_PROPERTY_TYPE.SELECT },
  {
    key: 'status',
    options: [
      option('open', PAGE_STATUS_GROUP.TO_DO),
      option('doing', PAGE_STATUS_GROUP.IN_PROGRESS),
      option('closed', PAGE_STATUS_GROUP.COMPLETE),
    ],
    type: PAGE_PROPERTY_TYPE.STATUS,
  },
  { key: 'points', type: PAGE_PROPERTY_TYPE.NUMBER },
  { key: 'tags', options: [option('a'), option('b'), option('c')], type: PAGE_PROPERTY_TYPE.MULTI_SELECT },
  { key: 'done', type: PAGE_PROPERTY_TYPE.CHECKBOX },
  { key: 'owner', type: PAGE_PROPERTY_TYPE.PERSON },
];

const row = (id: string, title: string, propertyValues: PagePropertyValues): LocalPageQueryRow => ({
  id,
  propertyValues,
  title,
});

const ROWS: readonly LocalPageQueryRow[] = [
  row('r1', 'Alpha', { done: true, points: 5, priority: 'high', status: 'open', tags: ['a', 'b'] }),
  row('r2', 'Bravo', { done: false, points: 2, priority: 'low', status: 'doing', tags: ['b'] }),
  row('r3', 'Charlie', { points: 9, priority: 'high', status: 'closed', tags: [] }),
  row('r4', 'Delta', { done: true, priority: 'mid', status: 'open' }),
  row('r5', 'Echo', { points: 2, tags: ['zzz'] }),
];

const context = { now: Date.UTC(2026, 0, 15), timeZone: 'UTC', viewerId: 'me' } as const;

const input = (
  reducers: LocalPageQueryInput<LocalPageQueryRow>['request']['reducers'],
  configuration: Record<string, unknown> = {},
  extra: Partial<LocalPageQueryInput<LocalPageQueryRow>['request']> = {},
): LocalPageQueryInput<LocalPageQueryRow> => ({
  configuration: readPageViewConfiguration(configuration),
  context,
  properties: PROPERTIES,
  request: { reducers, ...extra },
  rows: ROWS,
});

const idsOf = (outcomes: Readonly<Record<string, PageQueryOutcome>>, reducerId: string): readonly string[] => {
  const outcome = Object.entries(outcomes).find(([id]) => id === reducerId)?.[1];
  if (outcome?.kind !== 'results') throw new Error('No outcome');
  return outcome.ids;
};

describe('runLocalPageQuery results', () => {
  it('keeps the manual order of the rows when nothing sorts them', () => {
    const answered = runLocalPageQuery(input([{ id: 'rows', kind: 'results' }]));

    expect(answered.isOk() && idsOf(answered.getValue(), 'rows')).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
  });

  it('filters with the filter of the view and the quick filter together', () => {
    const answered = runLocalPageQuery(
      input(
        [{ id: 'rows', kind: 'results' }],
        {
          filter: {
            conditions: [
              { kind: 'CONDITION', operator: PAGE_FILTER_OPERATOR.IS, propertyKey: 'priority', value: 'high' },
            ],
            kind: 'GROUP',
            operator: 'AND',
          },
        },
        {
          quickFilter: {
            kind: 'CONDITION',
            operator: PAGE_FILTER_OPERATOR.IS_GREATER_THAN,
            propertyKey: 'points',
            value: 5,
          },
        },
      ),
    );

    expect(answered.isOk() && idsOf(answered.getValue(), 'rows')).toEqual(['r3']);
  });

  it('sorts by the view and breaks ties with the manual order, empty values last', () => {
    const answered = runLocalPageQuery(
      input([{ id: 'rows', kind: 'results' }], {
        sorts: [{ direction: PAGE_SORT_DIRECTION.DESCENDING, propertyKey: 'points' }],
      }),
    );

    expect(answered.isOk() && idsOf(answered.getValue(), 'rows')).toEqual(['r3', 'r1', 'r2', 'r5', 'r4']);
  });

  it('lets the request sorts replace the sorts of the view', () => {
    const answered = runLocalPageQuery(
      input(
        [{ id: 'rows', kind: 'results' }],
        { sorts: [{ direction: PAGE_SORT_DIRECTION.DESCENDING, propertyKey: 'points' }] },
        { sorts: [] },
      ),
    );

    expect(answered.isOk() && idsOf(answered.getValue(), 'rows')).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
  });

  it('pages with a cursor that continues where the last page ended', () => {
    const first = runLocalPageQuery(input([{ id: 'rows', kind: 'results', limit: 2 }]));
    const firstOutcome = first.isOk() ? (first.getValue().rows as PageQueryResultsOutcome) : null;
    const next = runLocalPageQuery(
      input([{ cursor: firstOutcome?.nextCursor ?? undefined, id: 'rows', kind: 'results', limit: 2 }]),
    );
    const last = next.isOk() ? (next.getValue().rows as PageQueryResultsOutcome) : null;
    const end = runLocalPageQuery(
      input([{ cursor: last?.nextCursor ?? undefined, id: 'rows', kind: 'results', limit: 2 }]),
    );

    expect(firstOutcome?.ids).toEqual(['r1', 'r2']);
    expect(last?.ids).toEqual(['r3', 'r4']);
    expect(end.isOk() && (end.getValue().rows as PageQueryResultsOutcome)).toEqual({
      ids: ['r5'],
      kind: 'results',
      nextCursor: null,
    });
  });

  it('refuses to answer a search, which only the server can normalize', () => {
    const answered = runLocalPageQuery(input([{ id: 'rows', kind: 'results' }], {}, { search: 'alpha' }));

    expect(answered.isFail() && answered.getError()).toBe('search');
  });

  it('resolves the markers of the filter for the viewer', () => {
    const answered = runLocalPageQuery(
      input(
        [{ id: 'rows', kind: 'results' }],
        {},
        {
          quickFilter: {
            kind: 'CONDITION',
            operator: PAGE_FILTER_OPERATOR.CONTAINS,
            propertyKey: 'owner',
            value: '@me',
          },
        },
      ),
    );

    expect(answered.isOk() && idsOf(answered.getValue(), 'rows')).toEqual([]);
  });
});

describe('runLocalPageQuery groups', () => {
  const groupsOf = (configuration: Record<string, unknown>, reducer: Record<string, unknown> = {}) => {
    const answered = runLocalPageQuery(input([{ id: 'g', kind: 'groups', ...reducer }], configuration));
    return answered.isOk() ? (answered.getValue().g as PageQueryGroupsOutcome) : null;
  };

  it('makes a group of every option, in the order of the options, then one for the rows without a value', () => {
    const outcome = groupsOf({ groupBy: 'priority' });

    expect(outcome?.groups.map((group) => [group.key, group.ids])).toEqual([
      ['low', ['r2']],
      ['mid', ['r4']],
      ['high', ['r1', 'r3']],
      ['unassigned', ['r5']],
    ]);
  });

  it('puts a row with several values in every one of their groups, and a row with an unknown one with the unassigned', () => {
    const outcome = groupsOf({ groupBy: 'tags' });

    expect(outcome?.groups.map((group) => [group.key, group.ids])).toEqual([
      ['a', ['r1']],
      ['b', ['r1', 'r2']],
      ['c', []],
      ['unassigned', ['r3', 'r4', 'r5']],
    ]);
  });

  it('groups a status by option or by its three groups, and leaves a row with no status out', () => {
    const byOption = groupsOf({ groupBy: 'status' });
    const byGroup = groupsOf({ groupBy: 'status', groupByMode: 'GROUP' });

    expect(byOption?.groups.map((group) => [group.key, group.ids])).toEqual([
      ['open', ['r1', 'r4']],
      ['doing', ['r2']],
      ['closed', ['r3']],
    ]);
    expect(byGroup?.groups.map((group) => group.key)).toEqual(['TO_DO', 'IN_PROGRESS', 'COMPLETE']);
  });

  it('groups a checkbox as checked, unchecked and not set', () => {
    const outcome = groupsOf({ groupBy: 'done' });

    expect(outcome?.groups.map((group) => [group.key, group.ids])).toEqual([
      ['true', ['r1', 'r4']],
      ['false', ['r2']],
      ['unassigned', ['r3', 'r5']],
    ]);
  });

  it('marks the hidden groups and leaves them out unless asked for them', () => {
    const shown = groupsOf({ groupBy: 'priority', hiddenGroups: ['mid'] });
    const all = groupsOf({ groupBy: 'priority', hiddenGroups: ['mid'] }, { includeHidden: true });

    expect(shown?.groups.map((group) => group.key)).toEqual(['low', 'high', 'unassigned']);
    expect(all?.groups.find((group) => group.key === 'mid')?.isHidden).toBe(true);
  });

  it('drops the empty groups when the view asks for it', () => {
    const outcome = groupsOf({ groupBy: 'tags', hidesEmptyGroups: true });

    expect(outcome?.groups.map((group) => group.key)).toEqual(['a', 'b', 'unassigned']);
  });

  it('limits the rows of a group and gives the cursor that continues it', () => {
    const outcome = groupsOf({ groupBy: 'priority' }, { rowsPerGroup: 1 });
    const high = outcome?.groups.find((group) => group.key === 'high');

    expect(high?.ids).toEqual(['r1']);
    expect(high?.nextCursor).not.toBeNull();
  });

  it('crosses two groupings into cells', () => {
    const outcome = groupsOf({ groupBy: 'priority', subGroupBy: 'done' });
    const cell = outcome?.groups.find((group) => group.key === 'high' && group.subKey === 'true');

    expect(cell?.ids).toEqual(['r1']);
    expect(outcome?.groups).toHaveLength(12);
  });

  it('refuses to group by what only the server can name the groups of', () => {
    const answered = runLocalPageQuery(input([{ id: 'g', kind: 'groups' }], { groupBy: 'owner' }));

    expect(answered.isFail() && answered.getError()).toBe('unsupported-grouping');
  });

  it('continues a group from its cursor', () => {
    const first = groupsOf({ groupBy: 'priority' }, { rowsPerGroup: 1 });
    const cursor = first?.groups.find((group) => group.key === 'high')?.nextCursor ?? undefined;
    const answered = runLocalPageQuery(
      input([{ cursor, group: { key: 'high' }, id: 'more', kind: 'groupResults', limit: 5 }], { groupBy: 'priority' }),
    );

    expect(answered.isOk() && idsOf(answered.getValue(), 'more')).toEqual(['r3']);
  });
});

describe('runLocalPageQuery aggregations', () => {
  const aggregate = (configuration: Record<string, unknown>, by: 'GROUP' | 'NONE') => {
    const answered = runLocalPageQuery(
      input(
        [
          {
            by,
            id: 'counts',
            items: [
              { calculation: PAGE_VIEW_CALCULATION.COUNT_ALL, id: 'count', propertyKey: null },
              { calculation: PAGE_VIEW_CALCULATION.SUM, id: 'sum', propertyKey: 'points' },
            ],
            kind: 'aggregations',
          },
        ],
        configuration,
      ),
    );
    return answered.isOk() ? (answered.getValue().counts as PageQueryAggregationsOutcome) : null;
  };

  it('counts and totals the rows the view lets through', () => {
    const outcome = aggregate({}, 'NONE');

    expect(outcome?.totals).toEqual({ count: 5, sum: 18 });
    expect(outcome?.distinctRowCount).toBe(5);
  });

  it('counts a row once in the total and in every group it is in', () => {
    const outcome = aggregate({ groupBy: 'tags' }, 'GROUP');
    const countOf = (key: string): unknown => outcome?.groups.find((group) => group.key === key)?.values.count;

    expect(outcome?.distinctRowCount).toBe(5);
    expect(countOf('b')).toBe(2);
    expect(countOf('unassigned')).toBe(3);
    expect(outcome?.groups.find((group) => group.key === 'c')).toBeUndefined();
  });
});

describe('listing whole groups', () => {
  it('lists every row the view lets through in the order it reads them', () => {
    const listed = listLocalPageRows(
      input([], { sorts: [{ direction: PAGE_SORT_DIRECTION.ASCENDING, propertyKey: 'points' }] }),
    );

    expect(listed.isOk() && listed.getValue().map((row) => row.id)).toEqual(['r2', 'r5', 'r1', 'r3', 'r4']);
  });

  it('gives each group all of its rows, not a page of them', () => {
    const listed = listLocalPageCells(input([], { groupBy: 'priority' }));

    expect(listed.isOk() && listed.getValue().cells.map((cell) => [cell.key, cell.rows.length])).toEqual([
      ['low', 1],
      ['mid', 1],
      ['high', 2],
      ['unassigned', 1],
    ]);
  });

  it('refuses a grouping the server alone can name', () => {
    const listed = listLocalPageCells(input([], { groupBy: 'owner' }));

    expect(listed.isFail() && listed.getError()).toBe('unsupported-grouping');
  });
});
