import { describe, expect, it } from 'bun:test';
import { readClientView } from '@/modules/pages/collections/lib/pages.client-view.lib';
import type { ClientViewInput } from '@/modules/pages/collections/types/pages.client-view.types';
import type { PageRow, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';
import { buildView } from './pages.views.fixture';

const rowOf = (id: string, propertyValues: PageRow['propertyValues']): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues,
  spaceId: 'space-1',
  title: id,
});

const properties: readonly PageSchemaProperty[] = [
  { config: defaultConfig, key: 'title', label: 'Title', options: null, required: false, type: 'TITLE' },
  {
    config: defaultConfig,
    key: 'status',
    label: 'Status',
    options: asPropertyOptions('todo', 'done'),
    required: false,
    type: 'SELECT',
  },
  { config: defaultConfig, key: 'points', label: 'Points', options: null, required: false, type: 'NUMBER' },
  {
    config: defaultConfig,
    key: 'kind',
    label: 'Kind',
    options: asPropertyOptions('bug', 'idea'),
    required: false,
    type: 'SELECT',
  },
  { config: defaultConfig, key: 'owner', label: 'Owner', options: null, required: false, type: 'PERSON' },
];

const rows: readonly PageRow[] = [
  rowOf('a', { kind: 'bug', points: 3, status: 'todo' }),
  rowOf('b', { kind: 'idea', points: 1, status: 'done' }),
  rowOf('c', { kind: 'bug', points: 8, status: 'todo' }),
  rowOf('d', { points: 2 }),
];

const input = (overrides: Partial<ClientViewInput> = {}): ClientViewInput => ({
  properties,
  quickFilter: null,
  readNow: () => Date.UTC(2026, 9, 21),
  rows,
  shown: {},
  statusGroupLabel: (group) => group,
  timeZone: 'UTC',
  view: buildView('Table', 'TABLE'),
  viewerId: 'me',
  ...overrides,
});

const idsOf = (rowsOfCell: readonly PageRow[]): readonly string[] => rowsOfCell.map((row) => row.id);

describe('readClientView', () => {
  it('draws a view without grouping as one unnamed group in the manual order', () => {
    const reading = readClientView(input());

    expect(reading.isOk() && reading.getValue().outcome.kind).toBe('FLAT_ROWS');
    expect(reading.isOk() && idsOf(reading.getValue().bands[0]?.groups[0]?.rows ?? [])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('shows a first page and says there are more rows when there are', () => {
    const many = Array.from({ length: 60 }, (_unused, index) => rowOf(`r${String(index)}`, null));
    const first = readClientView(input({ rows: many }));
    const second = readClientView(input({ rows: many, shown: { '|': 80 } }));

    expect(first.isOk() && first.getValue().bands[0]?.groups[0]?.rows).toHaveLength(50);
    expect(first.isOk() && first.getValue().bands[0]?.groups[0]?.nextCursor).not.toBeNull();
    expect(second.isOk() && second.getValue().bands[0]?.groups[0]?.rows).toHaveLength(60);
    expect(second.isOk() && second.getValue().bands[0]?.groups[0]?.nextCursor).toBeNull();
  });

  it('groups by an option, naming each group and leaving the rows without a value for the last one', () => {
    const reading = readClientView(
      input({ view: buildView('Board', 'BOARD', { configuration: { groupBy: 'status' } }) }),
    );
    const groups = reading.isOk() ? (reading.getValue().bands[0]?.groups ?? []) : [];

    expect(reading.isOk() && reading.getValue().outcome.kind).toBe('GROUPED_ROWS');
    expect(groups.map((group) => [group.key, group.label, idsOf(group.rows)])).toEqual([
      ['todo', 'todo', ['a', 'c']],
      ['done', 'done', ['b']],
      ['unassigned', '', ['d']],
    ]);
  });

  it('crosses two groupings into bands of columns', () => {
    const reading = readClientView(
      input({ view: buildView('Board', 'BOARD', { configuration: { groupBy: 'status', subGroupBy: 'kind' } }) }),
    );
    const bands = reading.isOk() ? reading.getValue().bands : [];

    expect(reading.isOk() && reading.getValue().outcome.kind).toBe('BANDED_ROWS');
    expect(bands.map((band) => band.key)).toEqual(['bug', 'idea', 'unassigned']);
    expect(idsOf(bands[0]?.groups.find((group) => group.key === 'todo')?.rows ?? [])).toEqual(['a', 'c']);
  });

  it('filters with the quick filter and sorts with the sorts of the view', () => {
    const reading = readClientView(
      input({
        quickFilter: { kind: 'CONDITION', operator: 'IS_GREATER_THAN', propertyKey: 'points', value: 1 },
        view: buildView('Table', 'TABLE', {
          configuration: { sorts: [{ direction: 'DESCENDING', propertyKey: 'points' }] },
        }),
      }),
    );

    expect(reading.isOk() && idsOf(reading.getValue().bands[0]?.groups[0]?.rows ?? [])).toEqual(['c', 'a', 'd']);
  });

  it('counts the rows of every group and the calculations of the columns the way the server answers', () => {
    const reading = readClientView(
      input({
        view: buildView('Board', 'BOARD', {
          configuration: { calculations: { points: 'SUM' }, groupBy: 'status' },
        }),
      }),
    );

    const aggregates = reading.isOk() ? reading.getValue().aggregates : null;

    expect(aggregates?.groupCounts).toEqual({ done: 1, todo: 2, unassigned: 1 });
    expect(aggregates?.distinctRowCount).toBe(4);
    expect(aggregates?.calculations).toEqual({ 'calculation:points:SUM': 14 });
  });

  it('refuses a grouping that only the server can make', () => {
    const reading = readClientView(
      input({ view: buildView('Board', 'BOARD', { configuration: { groupBy: 'owner' } }) }),
    );

    expect(reading.isFail() && reading.getError()).toBe('unsupported-grouping');
  });
});
