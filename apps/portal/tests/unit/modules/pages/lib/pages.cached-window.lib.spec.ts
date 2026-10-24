import { describe, expect, it } from 'bun:test';
import { placeCachedWindowChanges } from '@/modules/pages/collections/lib/pages.cached-paint.lib';
import { readCachedViewLayout, toCachedView } from '@/modules/pages/collections/lib/pages.view-cache.lib';
import type { CachedPaint } from '@/modules/pages/collections/types/pages.cached-paint.types';
import type { PageCollectionChanges } from '@/modules/pages/collections/types/pages.query.types';
import type { PageRow, PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { defaultConfig } from './pages.options.fixture';
import { buildView } from './pages.views.fixture';

const properties: readonly PageSchemaProperty[] = [
  { config: defaultConfig, key: 'title', label: 'Title', options: null, required: false, type: 'TITLE' },
  { config: defaultConfig, key: 'due', label: 'Due', options: null, required: false, type: 'DATE' },
];

const rowOn = (id: string, start: null | string, version = 1): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues: start === null ? {} : { due: { start } },
  spaceId: 'space-1',
  title: id,
  version,
});

const changesOf = (rows: readonly PageRow[], trashedIds: readonly string[] = []): PageCollectionChanges => ({
  attachedFiles: [],
  cursor: 'cursor-2',
  hasMore: false,
  isReset: false,
  possiblyChanged: [],
  possiblyChangedIsTruncated: false,
  relatedRows: [],
  rows,
  total: 0,
  trashedIds,
});

const paintOf = (type: 'CALENDAR' | 'TIMELINE', held: readonly PageRow[], isTruncated = false): CachedPaint => {
  const view = buildView(type, type, { configuration: { dateProperty: 'due' }, isDefault: true });
  const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [view] };
  const cached = toCachedView({
    aggregates: null,
    lookups: { attachedFiles: [], people: [], relatedRows: [] },
    outcome:
      type === 'CALENDAR'
        ? {
            calendar: { day: '2026-10-01', isTruncated, month: '2026-10', scale: 'MONTH', undated: 1 },
            kind: 'FLAT_ROWS',
            rows: held,
          }
        : {
            kind: 'FLAT_ROWS',
            rows: held,
            timeline: {
              anchor: '2026-10-15',
              isTruncated,
              scale: 'MONTH',
              today: '2026-10-15',
              undated: 0,
              undatedRows: [],
              window: { end: '2026-10-31', start: '2026-10-01' },
            },
          },
    personOptions: [],
    schema,
    view,
    viewerId: 'user-1',
  });
  const read = readCachedViewLayout(cached.layout, new Map(cached.rows.map((row) => [row.id, row])));
  if (read === null) throw new Error('layout could not be read');
  return { changesCursor: 'cursor-1', ids: cached.ids, key: 'k', read };
};

const place = (paint: CachedPaint, changes: PageCollectionChanges) =>
  placeCachedWindowChanges({ changes, hasSearch: false, paint, quickFilter: null });

describe('placeCachedWindowChanges', () => {
  it('takes a row out of a calendar when it was moved to a day the grid does not draw', () => {
    const paint = paintOf('CALENDAR', [rowOn('a', '2026-10-05'), rowOn('b', '2026-10-06')]);

    const placed = place(paint, changesOf([rowOn('a', '2027-03-01', 2)]));

    expect(placed?.rows.map((row) => row.id)).toEqual(['b']);
    expect(placed?.hasChanged).toBe(true);
    expect(placed?.cursor).toBe('cursor-2');
  });

  it('brings in a row that was dated inside the grid, and replaces one that stays', () => {
    const paint = paintOf('CALENDAR', [rowOn('a', '2026-10-05')]);

    const placed = place(paint, changesOf([rowOn('a', '2026-10-09', 2), rowOn('c', '2026-10-10')]));

    expect(placed?.rows.map((row) => row.id)).toEqual(['a', 'c']);
    expect(placed?.rows[0]?.version).toBe(2);
  });

  it('drops a row that was sent to the trash', () => {
    const paint = paintOf('CALENDAR', [rowOn('a', '2026-10-05'), rowOn('b', '2026-10-06')]);

    const placed = place(paint, changesOf([], ['b']));

    expect(placed?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('says nothing changed when the changes do not touch the grid', () => {
    const paint = paintOf('CALENDAR', [rowOn('a', '2026-10-05')]);

    const placed = place(paint, changesOf([rowOn('z', '2030-01-01')]));

    expect(placed?.hasChanged).toBe(false);
  });

  it('leaves the copy when the grid holds only the first rows and a new one comes in', () => {
    const paint = paintOf('CALENDAR', [rowOn('a', '2026-10-05')], true);

    expect(place(paint, changesOf([rowOn('c', '2026-10-10')]))).toBeNull();
  });

  it('leaves the copy when the server cannot describe what changed', () => {
    const paint = paintOf('CALENDAR', [rowOn('a', '2026-10-05')]);

    expect(place(paint, { ...changesOf([]), isReset: true })).toBeNull();
  });

  it('places the rows of a timeline by the days of its window and lists the ones with no start apart', () => {
    const paint = paintOf('TIMELINE', [rowOn('a', '2026-10-05')]);

    const placed = place(paint, changesOf([rowOn('a', null, 2), rowOn('c', '2026-10-20')]));

    expect(placed?.rows.map((row) => row.id)).toEqual(['c']);
    expect(placed?.undatedRows.map((row) => row.id)).toEqual(['a']);
  });

  it('keeps each changed row under the version the server gave it', () => {
    const paint = paintOf('CALENDAR', [rowOn('a', '2026-10-05')]);

    const placed = place(paint, changesOf([rowOn('a', '2026-10-09', 7)]));

    expect(placed?.bodies.map((body) => [body.id, body.version])).toEqual([['a', 7]]);
  });
});
