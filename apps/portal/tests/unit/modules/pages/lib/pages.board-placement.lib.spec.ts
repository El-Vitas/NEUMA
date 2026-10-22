import { describe, expect, it } from 'bun:test';
import { UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { placeChangedBoardRows } from '@/modules/pages/collections/lib/pages.board-placement.lib';
import type { BoardPlacementContext } from '@/modules/pages/collections/types/pages.board-placement.types';
import type { PageRow, PageSchemaProperty, PageViewBand } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';

const rowOf = (id: string, propertyValues: PageRow['propertyValues'] = null, title = id): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues,
  spaceId: 'space-1',
  title,
});

const property = (key: string, type: PageSchemaProperty['type'], options?: readonly string[]): PageSchemaProperty => ({
  config: defaultConfig,
  key,
  label: key,
  options: options === undefined ? null : asPropertyOptions(...options),
  required: false,
  type,
});

const properties: readonly PageSchemaProperty[] = [
  property('title', 'TITLE'),
  property('status', 'SELECT', ['todo', 'doing', 'done']),
  property('points', 'NUMBER'),
  property('tags', 'MULTI_SELECT', ['a', 'b']),
  property('parent', 'RELATION'),
  property('due', 'DATE'),
];

const column = (key: string, rows: readonly PageRow[], nextCursor: null | string = null) => ({
  color: null,
  key,
  label: key,
  nextCursor,
  rows,
});

const board = (...columns: readonly ReturnType<typeof column>[]): readonly PageViewBand[] => [
  { color: null, groups: columns, key: '', label: '' },
];

const baseContext: BoardPlacementContext = {
  filter: null,
  groupByKey: 'status',
  groupByMode: 'OPTION',
  hasSearch: false,
  hiddenGroups: [],
  now: Date.UTC(2026, 9, 21),
  properties,
  sorts: [{ direction: 'ASCENDING', propertyKey: 'points' }],
  subGroupByKey: '',
  timeZone: 'UTC',
  viewerId: null,
};

const idsOf = (bands: readonly PageViewBand[], groupKey: string): readonly string[] =>
  bands[0]?.groups.find((group) => group.key === groupKey)?.rows.map((row) => row.id) ?? [];

const place = (
  bands: readonly PageViewBand[],
  changedRows: readonly PageRow[],
  context: Partial<BoardPlacementContext> = {},
  trashedIds: readonly string[] = [],
) => placeChangedBoardRows({ bands, changedRows, context: { ...baseContext, ...context }, trashedIds });

describe('placeChangedBoardRows with a sorted view', () => {
  const start = board(
    column('todo', [rowOf('a', { points: 1, status: 'todo' }), rowOf('b', { points: 5, status: 'todo' })]),
    column('doing', [rowOf('c', { points: 3, status: 'doing' })]),
    column('done', []),
  );

  it('moves a card to another column at the place its sort says', () => {
    const outcome = place(start, [rowOf('a', { points: 1, status: 'doing' })]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['b']);
    expect(idsOf(outcome.bands, 'doing')).toEqual(['a', 'c']);
    expect(outcome.refreshColumns).toEqual([]);
    expect(outcome.isCountChanged).toBe(true);
  });

  it('puts a card between two others when its sort value falls there', () => {
    const outcome = place(start, [rowOf('c', { points: 4, status: 'todo' })]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['a', 'c', 'b']);
    expect(idsOf(outcome.bands, 'doing')).toEqual([]);
  });

  it('re-sorts a card whose sort value changed inside its column', () => {
    const outcome = place(start, [rowOf('a', { points: 9, status: 'todo' })]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['b', 'a']);
    expect(outcome.isCountChanged).toBe(false);
  });

  it('replaces the row in place when only a shown value changed', () => {
    const outcome = place(start, [rowOf('b', { points: 5, status: 'todo' }, 'renamed')]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(outcome.bands[0]?.groups[0]?.rows.map((row) => row.title)).toEqual(['a', 'renamed']);
  });

  it('adds a card that is new and sorts inside a column read to its end', () => {
    const outcome = place(start, [rowOf('d', { points: 2, status: 'done' })]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'done')).toEqual(['d']);
    expect(outcome.isCountChanged).toBe(true);
  });

  it('does not place a card after the last one of a column that has more to load, but counts it', () => {
    const partial = board(column('todo', [rowOf('a', { points: 1, status: 'todo' })], 'cursor-1'));
    const outcome = place(partial, [rowOf('z', { points: 99, status: 'todo' })]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['a']);
    expect(outcome.isCountChanged).toBe(true);
  });

  it('places a card inside the loaded range of a column that has more to load', () => {
    const partial = board(
      column(
        'todo',
        [rowOf('a', { points: 1, status: 'todo' }), rowOf('b', { points: 9, status: 'todo' })],
        'cursor-1',
      ),
    );
    const outcome = place(partial, [rowOf('z', { points: 5, status: 'todo' })]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['a', 'z', 'b']);
  });

  it('removes a card that went to the trash', () => {
    const outcome = place(start, [], {}, ['a']);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['b']);
    expect(outcome.isCountChanged).toBe(true);
  });

  it('ignores a trashed id the board does not show', () => {
    const outcome = place(start, [], {}, ['unknown']);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(outcome.isCountChanged).toBe(false);
  });

  it('removes a card that no longer passes the filter', () => {
    const filter = { conditions: [], kind: 'GROUP', operator: 'AND' } as const;
    const narrowing = {
      ...filter,
      conditions: [{ kind: 'CONDITION', operator: 'IS_GREATER_THAN', propertyKey: 'points', value: 2 } as const],
    };
    const outcome = place(start, [rowOf('b', { points: 1, status: 'todo' })], { filter: narrowing });
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['a']);
  });

  it('adds a card that now passes the filter', () => {
    const filter = {
      conditions: [{ kind: 'CONDITION', operator: 'IS_GREATER_THAN', propertyKey: 'points', value: 2 } as const],
      kind: 'GROUP',
      operator: 'AND',
    } as const;
    const outcome = place(start, [rowOf('n', { points: 4, status: 'done' })], { filter });
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'done')).toEqual(['n']);
  });

  it('moves a card with a list value into every column its values name', () => {
    const grouped = board(
      column('a', [rowOf('x', { points: 1, tags: ['a'] })]),
      column('b', []),
      column(UNASSIGNED_GROUP_KEY, []),
    );
    const outcome = place(grouped, [rowOf('x', { points: 1, tags: ['a', 'b'] })], { groupByKey: 'tags' });
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'a')).toEqual(['x']);
    expect(idsOf(outcome.bands, 'b')).toEqual(['x']);
  });

  it('puts a card without a value in the column for no value', () => {
    const grouped = board(
      column('todo', [rowOf('a', { points: 1, status: 'todo' })]),
      column(UNASSIGNED_GROUP_KEY, []),
    );
    const outcome = place(grouped, [rowOf('a', { points: 1 })]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, UNASSIGNED_GROUP_KEY)).toEqual(['a']);
    expect(idsOf(outcome.bands, 'todo')).toEqual([]);
  });

  it('drops a card that moved into a group the view hides', () => {
    const outcome = place(start, [rowOf('a', { points: 1, status: 'done' })], { hiddenGroups: ['done'] });
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['b']);
    expect(idsOf(outcome.bands, 'done')).toEqual([]);
  });
});

describe('placeChangedBoardRows with markers in the filter', () => {
  const start = board(column('todo', []), column('done', []));
  const today = {
    conditions: [{ kind: 'CONDITION', operator: 'IS', propertyKey: 'due', value: '@today' } as const],
    kind: 'GROUP',
    operator: 'AND',
  } as const;
  const noon = Date.UTC(2026, 9, 21, 12);

  it('resolves a relative date for the day and zone of the reader', () => {
    const outcome = place(
      start,
      [
        rowOf('n', { due: { start: '2026-10-21' }, status: 'todo' }),
        rowOf('m', { due: { start: '2026-10-20' }, status: 'todo' }),
      ],
      { filter: today, now: noon },
    );
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['n']);
  });

  it('asks to read again when the filter names the reader and the reader is not known', () => {
    const me = {
      conditions: [{ kind: 'CONDITION', operator: 'CONTAINS', propertyKey: 'tags', value: '@me' } as const],
      kind: 'GROUP',
      operator: 'AND',
    } as const;
    expect(place(start, [rowOf('n', { status: 'todo', tags: ['a'] })], { filter: me })).toEqual({
      kind: 'requery',
      reason: 'viewer-marker',
    });
  });
});

describe('placeChangedBoardRows with a manual order', () => {
  const manual = { sorts: [] } as const;
  const start = board(
    column('todo', [rowOf('a', { status: 'todo' }), rowOf('b', { status: 'todo' })]),
    column('doing', [rowOf('c', { status: 'doing' })]),
  );

  it('removes the card from its old column and asks for the new column to be read again', () => {
    const outcome = place(start, [rowOf('a', { status: 'doing' })], manual);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, 'todo')).toEqual(['b']);
    expect(idsOf(outcome.bands, 'doing')).toEqual(['c']);
    expect(outcome.refreshColumns).toEqual([{ bandKey: '', groupKey: 'doing' }]);
  });

  it('keeps the place of a card whose column did not change', () => {
    const outcome = place(start, [rowOf('b', { status: 'todo' }, 'renamed')], manual);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(outcome.bands[0]?.groups[0]?.rows.map((row) => row.title)).toEqual(['a', 'renamed']);
    expect(outcome.refreshColumns).toEqual([]);
  });

  it('asks for the column to be read again when a card is new', () => {
    const outcome = place(start, [rowOf('n', { status: 'todo' })], manual);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(outcome.refreshColumns).toEqual([{ bandKey: '', groupKey: 'todo' }]);
  });
});

describe('placeChangedBoardRows with a view that does not group', () => {
  const flat = { groupByKey: '' } as const;
  const start = board(column('', [rowOf('a', { points: 1 }), rowOf('b', { points: 5 }), rowOf('c', { points: 8 })]));

  it('puts a changed row at the place its sort says inside the only group', () => {
    const outcome = place(start, [rowOf('a', { points: 6 })], flat);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, '')).toEqual(['b', 'a', 'c']);
    expect(outcome.refreshColumns).toEqual([]);
  });

  it('adds a new row where it sorts and counts it', () => {
    const outcome = place(start, [rowOf('n', { points: 2 })], flat);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, '')).toEqual(['a', 'n', 'b', 'c']);
    expect(outcome.isCountChanged).toBe(true);
  });

  it('removes a row that no longer passes the filter', () => {
    const filter = {
      conditions: [{ kind: 'CONDITION', operator: 'IS_LESS_THAN', propertyKey: 'points', value: 7 } as const],
      kind: 'GROUP',
      operator: 'AND',
    } as const;
    const outcome = place(start, [rowOf('b', { points: 9 })], { ...flat, filter });
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(idsOf(outcome.bands, '')).toEqual(['a', 'c']);
  });

  it('asks for the group to be read again when the view follows a manual order and a row is new', () => {
    const outcome = place(start, [rowOf('n', { points: 2 })], { ...flat, sorts: [] });
    if (outcome.kind !== 'placed') throw new Error('expected a placement');
    expect(outcome.refreshColumns).toEqual([{ bandKey: '', groupKey: '' }]);
  });
});

describe('placeChangedBoardRows when it cannot tell', () => {
  const start = board(column('todo', [rowOf('a', { points: 1, status: 'todo' })]), column('done', []));

  it('asks to read again while the view is searched', () => {
    expect(place(start, [rowOf('a', { points: 1, status: 'done' })], { hasSearch: true })).toEqual({
      kind: 'requery',
      reason: 'search',
    });
  });

  it('asks to read again when the sort uses a relation', () => {
    expect(
      place(start, [rowOf('a', { points: 1, status: 'done' })], {
        sorts: [{ direction: 'ASCENDING', propertyKey: 'parent' }],
      }),
    ).toEqual({ kind: 'requery', reason: 'server-only-property' });
  });

  it('asks to read again when the filter uses a relation', () => {
    const filter = {
      conditions: [{ kind: 'CONDITION', operator: 'IS_NOT_EMPTY', propertyKey: 'parent', value: null } as const],
      kind: 'GROUP',
      operator: 'AND',
    } as const;
    expect(place(start, [rowOf('a', { points: 1, status: 'done' })], { filter })).toEqual({
      kind: 'requery',
      reason: 'server-only-property',
    });
  });

  it('asks to read again when a card moves to a column the board does not draw', () => {
    expect(place(start, [rowOf('a', { points: 1, status: 'doing' })])).toEqual({
      kind: 'requery',
      reason: 'unknown-group',
    });
  });

  it('asks to read again when a card enters a grouping by a date', () => {
    expect(place(start, [rowOf('n', { due: { start: '2026-01-01' }, points: 1 })], { groupByKey: 'due' })).toEqual({
      kind: 'requery',
      reason: 'unsupported-grouping',
    });
  });

  it('places a card whose date grouping value did not change', () => {
    const dated = board(column('2026-01-01', [rowOf('a', { due: { start: '2026-01-01' }, points: 1 })]));
    const outcome = place(dated, [rowOf('a', { due: { start: '2026-01-01' }, points: 2 }, 'renamed')], {
      groupByKey: 'due',
    });
    expect(outcome.kind).toBe('placed');
  });
});
