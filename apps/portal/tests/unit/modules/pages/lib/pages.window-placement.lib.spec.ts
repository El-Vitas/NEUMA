import { describe, expect, it } from 'bun:test';
import type { PageFilter } from '@neuma/shared';
import { placeChangedWindowRows } from '@/modules/pages/collections/lib/pages.window-placement.lib';
import type { PageRow, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import type { WindowPlacementContext } from '@/modules/pages/collections/types/pages.window-placement.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';

const rowOf = (id: string, due: string | null, extra: PageRow['propertyValues'] = null): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: { ...extra, ...(due === null ? {} : { due: { start: due } }) },
  spaceId: 'space-1',
  title: id,
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
  property('due', 'DATE'),
  property('status', 'SELECT', ['todo', 'done']),
  property('parent', 'RELATION'),
];

const october: PageFilter = {
  kind: 'CONDITION',
  operator: 'IS',
  propertyKey: 'due',
  value: { end: '2026-10-31', start: '2026-10-01' },
};

const undated: PageFilter = { kind: 'CONDITION', operator: 'IS_EMPTY', propertyKey: 'due', value: null };

const context: WindowPlacementContext = {
  filter: null,
  hasSearch: false,
  isTruncated: false,
  now: Date.UTC(2026, 9, 21),
  properties,
  timeZone: 'UTC',
  undatedFilter: undated,
  undatedTotal: 1,
  viewerId: 'me',
  windowFilters: [october],
};

const place = (
  changedRows: readonly PageRow[],
  overrides: Partial<WindowPlacementContext> = {},
  trashedIds: readonly string[] = [],
) =>
  placeChangedWindowRows({
    changedRows,
    context: { ...context, ...overrides },
    rows: [rowOf('a', '2026-10-05'), rowOf('b', '2026-10-20')],
    trashedIds,
    undatedRows: [rowOf('u', null)],
  });

const idsOf = (rows: readonly PageRow[]): readonly string[] => rows.map((row) => row.id);

describe('placeChangedWindowRows', () => {
  it('replaces a row of the window in place when it changed and is still in it', () => {
    const outcome = place([rowOf('a', '2026-10-06')]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');

    expect(idsOf(outcome.rows)).toEqual(['a', 'b']);
    expect(outcome.rows[0]?.propertyValues).toEqual({ due: { start: '2026-10-06' } });
  });

  it('drops a row that moved out of the window', () => {
    const outcome = place([rowOf('a', '2026-12-05')]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');

    expect(idsOf(outcome.rows)).toEqual(['b']);
  });

  it('brings in a row that moved into the window', () => {
    const outcome = place([rowOf('n', '2026-10-10')]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');

    expect(idsOf(outcome.rows)).toEqual(['a', 'b', 'n']);
  });

  it('ignores a row that is outside the window and was never in it', () => {
    const outcome = place([rowOf('far', '2027-02-01')]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');

    expect(idsOf(outcome.rows)).toEqual(['a', 'b']);
    expect(outcome.hasChanged).toBe(false);
  });

  it('drops a row that went to the trash from the window and from the rows without a date', () => {
    const outcome = place([], {}, ['a', 'u']);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');

    expect(idsOf(outcome.rows)).toEqual(['b']);
    expect(idsOf(outcome.undatedRows)).toEqual([]);
  });

  it('moves a row without a date into the window when it gets one', () => {
    const outcome = place([rowOf('u', '2026-10-12')]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');

    expect(idsOf(outcome.rows)).toEqual(['a', 'b', 'u']);
    expect(idsOf(outcome.undatedRows)).toEqual([]);
  });

  it('lists a row that lost its date with the ones that have none', () => {
    const outcome = place([rowOf('a', null)]);
    if (outcome.kind !== 'placed') throw new Error('expected a placement');

    expect(idsOf(outcome.rows)).toEqual(['b']);
    expect(idsOf(outcome.undatedRows)).toEqual(['u', 'a']);
  });

  it('drops a row that no longer passes the filter of the view', () => {
    const filter: PageFilter = { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'todo' };
    const outcome = placeChangedWindowRows({
      changedRows: [rowOf('a', '2026-10-05', { status: 'done' })],
      context: { ...context, filter },
      rows: [rowOf('a', '2026-10-05', { status: 'todo' })],
      trashedIds: [],
      undatedRows: [],
    });
    if (outcome.kind !== 'placed') throw new Error('expected a placement');

    expect(idsOf(outcome.rows)).toEqual([]);
  });

  it('asks the server again when a row comes in and the window holds only the first rows', () => {
    expect(place([rowOf('n', '2026-10-10')], { isTruncated: true })).toEqual({
      kind: 'requery',
      reason: 'window-truncated',
    });
  });

  it('asks the server again when a row loses its date and the list of rows without one is a part of them', () => {
    expect(place([rowOf('x', null)], { undatedTotal: 5 })).toEqual({ kind: 'requery', reason: 'undated-truncated' });
  });

  it('asks the server again while the view is searched', () => {
    expect(place([rowOf('a', '2026-10-06')], { hasSearch: true })).toEqual({ kind: 'requery', reason: 'search' });
  });

  it('asks the server again when the filter uses a relation', () => {
    const filter: PageFilter = { kind: 'CONDITION', operator: 'IS_NOT_EMPTY', propertyKey: 'parent', value: null };

    expect(place([rowOf('a', '2026-10-06')], { filter })).toEqual({ kind: 'requery', reason: 'server-only-property' });
  });

  it('asks the server again when the filter names the reader and the reader is not known', () => {
    const filter: PageFilter = { kind: 'CONDITION', operator: 'CONTAINS', propertyKey: 'status', value: '@me' };

    expect(place([rowOf('a', '2026-10-06')], { filter, viewerId: null })).toEqual({
      kind: 'requery',
      reason: 'viewer-marker',
    });
  });
});
