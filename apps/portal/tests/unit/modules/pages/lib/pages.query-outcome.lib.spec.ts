import { describe, expect, it } from 'bun:test';
import { describeGroupKey, toViewOutcome } from '@/modules/pages/collections/lib/pages.query-outcome.lib';
import type { PageQueryResult } from '@/modules/pages/collections/types/pages.query.types';
import type { PageRow, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';
import { buildView } from './pages.views.fixture';

const rowOf = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues: null,
  spaceId: 'space-1',
  title: id,
});

const status: PageSchemaProperty = {
  config: defaultConfig,
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'done'),
  required: false,
  type: 'SELECT',
};

const resultWith = (reducer: PageQueryResult['reducers'][string]): PageQueryResult => ({
  attachedFiles: [],
  changesCursor: 'cursor',
  reducers: { rows: reducer },
  relatedRows: [],
  rows: { a: rowOf('a'), b: rowOf('b') },
  spaceId: 'space-1',
  viewVersion: 0,
});

describe('cómo se llama un grupo', () => {
  it('names an option by what people read', () => {
    expect(describeGroupKey(status, 'OPTION', 'todo', (group) => group).label).toBe('todo');
  });

  it('leaves without a name the group of the rows that have no value', () => {
    expect(describeGroupKey(status, 'OPTION', 'unassigned', (group) => group)).toEqual({ color: null, label: '' });
  });

  it('falls back to the key when the option is gone', () => {
    expect(describeGroupKey(status, 'OPTION', 'gone', (group) => group).label).toBe('gone');
  });
});

describe('las filas que respondió una consulta', () => {
  const view = buildView('Table', 'TABLE');

  it('keeps the order of the ids and drops the ones that came without a record', () => {
    const outcome = toViewOutcome(
      resultWith({ ids: ['b', 'missing', 'a'], kind: 'results', nextCursor: 'next' }),
      view,
      [status],
      (group) => group,
    );

    expect(outcome).toMatchObject({ kind: 'FLAT_ROWS', nextCursor: 'next' });
    expect(outcome.kind === 'FLAT_ROWS' && outcome.rows.map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('draws the groups of a grouped view with the cursor that continues each', () => {
    const outcome = toViewOutcome(
      resultWith({
        groups: [
          { ids: ['a'], isHidden: false, key: 'todo', nextCursor: 'more', subKey: null },
          { ids: [], isHidden: false, key: 'done', nextCursor: null, subKey: null },
        ],
        hasMoreGroups: false,
        kind: 'groups',
      }),
      buildView('Board', 'BOARD', { configuration: { groupBy: 'status' } }),
      [status],
      (group) => group,
    );

    expect(outcome.kind).toBe('GROUPED_ROWS');
    expect(outcome.kind === 'GROUPED_ROWS' && outcome.groups.map((group) => [group.key, group.nextCursor])).toEqual([
      ['todo', 'more'],
      ['done', null],
    ]);
  });

  it('draws bands when the view has a second grouping', () => {
    const outcome = toViewOutcome(
      resultWith({
        groups: [
          { ids: ['a'], isHidden: false, key: 'todo', nextCursor: null, subKey: 'x' },
          { ids: ['b'], isHidden: false, key: 'todo', nextCursor: null, subKey: 'y' },
        ],
        hasMoreGroups: false,
        kind: 'groups',
      }),
      buildView('Board', 'BOARD', { configuration: { groupBy: 'status', subGroupBy: 'status' } }),
      [status],
      (group) => group,
    );

    expect(outcome.kind === 'BANDED_ROWS' && outcome.bands.map((band) => band.key)).toEqual(['x', 'y']);
  });
});
