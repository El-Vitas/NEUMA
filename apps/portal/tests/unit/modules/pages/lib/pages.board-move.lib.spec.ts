import { describe, expect, it } from 'bun:test';
import { UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { buildBoardMoveValues, resolveBoardAnchor } from '@/modules/pages/collections/lib/pages.board-move.lib';
import type { PageBoardGridMove } from '@/modules/pages/collections/types/pages.board-drag.types';
import type { PageRow, PageSchemaProperty, PageViewBand } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';

const rowOf = (id: string, propertyValues: PageRow['propertyValues'] = null): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues,
  spaceId: 'space-1',
  title: id,
});

const bandOf = (...columns: readonly { key: string; rows: readonly PageRow[] }[]): PageViewBand => ({
  color: null,
  groups: columns.map((column) => ({ color: null, key: column.key, label: column.key, rows: column.rows })),
  key: '',
  label: '',
});

const status: PageSchemaProperty = {
  config: defaultConfig,
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'done'),
  required: false,
  type: 'SELECT',
};

const tags: PageSchemaProperty = {
  config: defaultConfig,
  key: 'tags',
  label: 'Tags',
  options: asPropertyOptions('a', 'b', 'c'),
  required: false,
  type: 'MULTI_SELECT',
};

const moveTo = (propertyValue: null | string, changes: Partial<PageBoardGridMove> = {}): PageBoardGridMove => ({
  bandValue: null,
  beforeRowId: null,
  changesBand: false,
  changesGroup: true,
  changesOrder: true,
  propertyValue,
  ...changes,
});

describe('dónde queda una tarjeta soltada', () => {
  const bands = [
    bandOf(
      { key: 'todo', rows: [rowOf('a'), rowOf('b')] },
      { key: 'done', rows: [rowOf('c')] },
      { key: 'empty', rows: [] },
    ),
  ];

  it('goes before the card the pointer was on', () => {
    expect(resolveBoardAnchor(bands, 'a', { bandKey: '', beforeRowId: 'c', groupKey: 'done' })).toEqual({
      before: 'c',
    });
  });

  it('goes after the last card when dropped at the end of a column', () => {
    expect(resolveBoardAnchor(bands, 'a', { bandKey: '', beforeRowId: null, groupKey: 'done' })).toEqual({
      after: 'c',
    });
  });

  it('does not count itself as the last card of the column it already is in', () => {
    expect(resolveBoardAnchor(bands, 'b', { bandKey: '', beforeRowId: null, groupKey: 'todo' })).toEqual({
      after: 'a',
    });
  });

  it('has no neighbour in an empty column, and then keeps the place it had', () => {
    expect(resolveBoardAnchor(bands, 'a', { bandKey: '', beforeRowId: null, groupKey: 'empty' })).toEqual({});
  });
});

describe('qué valores escribe una tarjeta que cambia de columna', () => {
  const base = { fromBandKey: '', mode: 'OPTION' as const, subGroupByKey: '' };

  it('writes the option of the column in a property that holds one', () => {
    const write = buildBoardMoveValues({
      ...base,
      fromGroupKey: 'todo',
      groupByKey: 'status',
      move: moveTo('done'),
      properties: [status],
    });

    expect(write).toEqual({ listChanges: {}, values: { status: 'done' } });
  });

  it('writes nothing when the card only changes its place inside the column', () => {
    const write = buildBoardMoveValues({
      ...base,
      fromGroupKey: 'todo',
      groupByKey: 'status',
      move: moveTo(null, { changesGroup: false }),
      properties: [status],
    });

    expect(write).toEqual({ listChanges: {}, values: {} });
  });

  it('says what leaves and what enters a list, so the rest of its tags is never sent back', () => {
    const write = buildBoardMoveValues({
      ...base,
      fromGroupKey: 'a',
      groupByKey: 'tags',
      move: moveTo('b'),
      properties: [tags],
    });

    expect(write).toEqual({ listChanges: { tags: { add: ['b'], remove: ['a'] } }, values: {} });
  });

  it('only takes the value out when the card goes to a column without value', () => {
    const write = buildBoardMoveValues({
      ...base,
      fromGroupKey: 'a',
      groupByKey: 'tags',
      move: moveTo(null),
      properties: [tags],
    });

    expect(write).toEqual({ listChanges: { tags: { add: [], remove: ['a'] } }, values: {} });
  });

  it('only puts the value in when the card comes from the column without value', () => {
    const write = buildBoardMoveValues({
      ...base,
      fromGroupKey: UNASSIGNED_GROUP_KEY,
      groupByKey: 'tags',
      move: moveTo('b'),
      properties: [tags],
    });

    expect(write).toEqual({ listChanges: { tags: { add: ['b'], remove: [] } }, values: {} });
  });
});
