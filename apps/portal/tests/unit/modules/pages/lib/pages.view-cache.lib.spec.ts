import { describe, expect, it } from 'bun:test';
import {
  buildViewCacheKey,
  readCachedViewLayout,
  stripComputedValues,
  toCachedView,
} from '@/modules/pages/collections/lib/pages.view-cache.lib';
import type { PageRow, PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';
import { buildView } from './pages.views.fixture';

const rowOf = (id: string, propertyValues: PageRow['propertyValues'] = null): PageRow => ({
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
  { config: defaultConfig, key: 'title', label: 'title', options: null, required: false, type: 'TITLE' },
  {
    config: defaultConfig,
    key: 'status',
    label: 'status',
    options: asPropertyOptions('todo', 'done'),
    required: false,
    type: 'SELECT',
  },
  { config: defaultConfig, key: 'total', label: 'total', options: null, required: false, type: 'FORMULA' },
];

const view = buildView('Board', 'BOARD', { configuration: { groupBy: 'status' } });

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [view] };

const lookups = { attachedFiles: [], people: [], relatedRows: [] };

describe('buildViewCacheKey', () => {
  const base = { day: null, filter: null, month: null, pageId: 'collection-1', search: null, viewName: 'Board' };

  it('is the same for the same page and the same question', () => {
    expect(buildViewCacheKey(base)).toBe(buildViewCacheKey({ ...base }));
  });

  it('tells apart the views, the words searched, the quick filter and the days asked for', () => {
    const keys = [
      buildViewCacheKey(base),
      buildViewCacheKey({ ...base, viewName: 'Table' }),
      buildViewCacheKey({ ...base, search: 'ana' }),
      buildViewCacheKey({ ...base, filter: '{"kind":"CONDITION"}' }),
      buildViewCacheKey({ ...base, month: '2026-09' }),
      buildViewCacheKey({ ...base, day: '2026-09-01' }),
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('stripComputedValues', () => {
  it('leaves out what is computed, which is never trusted from the cache, and keeps the rest', () => {
    const stripped = stripComputedValues(
      [{ ...rowOf('a', { status: 'todo', total: 9 }), computedErrors: { total: { code: 'X', message: 'x' } } }],
      properties,
    );

    expect(stripped[0]?.propertyValues).toEqual({ status: 'todo' });
    expect(stripped[0]?.computedErrors).toBeUndefined();
  });
});

describe('a view kept in the cache', () => {
  const rows = [rowOf('a', { status: 'todo' }), rowOf('b', { status: 'done' })];

  const bandedOutcome = {
    groups: [
      { color: null, key: 'todo', label: 'todo', nextCursor: 'more', rows: [rows[0] as PageRow] },
      { color: null, key: 'done', label: 'done', nextCursor: null, rows: [rows[1] as PageRow] },
    ],
    kind: 'GROUPED_ROWS',
  } as const;

  it('keeps the groups as ids and brings them back as rows', () => {
    const cached = toCachedView({
      aggregates: null,
      lookups,
      outcome: bandedOutcome,
      personOptions: [],
      schema,
      view,
      viewerId: 'me',
    });
    const back = readCachedViewLayout(cached.layout, new Map(cached.rows.map((row) => [row.id, row])));

    expect(cached.ids).toEqual(['a', 'b']);
    expect(back?.bands[0]?.groups.map((group) => [group.key, group.nextCursor, group.rows.map((r) => r.id)])).toEqual([
      ['todo', 'more', ['a']],
      ['done', null, ['b']],
    ]);
  });

  it('keeps no computed value of the rows', () => {
    const cached = toCachedView({
      aggregates: null,
      lookups,
      outcome: {
        groups: [{ color: null, key: 'todo', label: 'todo', rows: [rowOf('a', { status: 'todo', total: 9 })] }],
        kind: 'GROUPED_ROWS',
      },
      personOptions: [],
      schema,
      view,
      viewerId: null,
    });

    expect(cached.rows[0]?.propertyValues).toEqual({ status: 'todo' });
  });

  it('keeps the rows of a screen of days and the rows without a date apart', () => {
    const dated = rowOf('d', { status: 'todo' });
    const undated = rowOf('u');
    const plan = buildView('Plan', 'TIMELINE');
    const cached = toCachedView({
      aggregates: null,
      lookups,
      outcome: {
        kind: 'FLAT_ROWS',
        rows: [dated],
        timeline: {
          anchor: '2026-09-16',
          isTruncated: false,
          scale: 'DAY',
          today: '2026-09-16',
          undated: 1,
          undatedRows: [undated],
          window: { end: '2026-10-18', start: '2026-09-07' },
        },
      },
      personOptions: [],
      schema: { ...schema, views: [plan] },
      view: plan,
      viewerId: null,
    });
    const back = readCachedViewLayout(cached.layout, new Map(cached.rows.map((row) => [row.id, row])));

    expect(cached.ids).toEqual(['d', 'u']);
    expect(back?.windowRows.map((row) => row.id)).toEqual(['d']);
    expect(back?.timeline?.undatedRows.map((row) => row.id)).toEqual(['u']);
  });

  it('is a miss, not a wrong view, when the text kept is not a layout', () => {
    expect(readCachedViewLayout('not json', new Map())).toBeNull();
    expect(readCachedViewLayout('{"viewId":3}', new Map())).toBeNull();
  });

  it('is a miss when a row it names is not there', () => {
    const cached = toCachedView({
      aggregates: null,
      lookups,
      outcome: bandedOutcome,
      personOptions: [],
      schema,
      view,
      viewerId: null,
    });

    expect(readCachedViewLayout(cached.layout, new Map())).toBeNull();
  });
});
