import { describe, expect, it } from 'bun:test';
import {
  buildCollectionViewHref,
  readCollectionMonth,
  readCollectionQuickFilter,
  readCollectionSearch,
  resolveActiveCollectionView,
} from '@/modules/pages/collections/lib/pages.collection.view-selection.lib';
import type { PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';

const table: PageSchemaView = {
  configuration: {},
  id: 'view-table',
  isDefault: false,
  name: 'Table',
  type: 'TABLE',
  version: 0,
};
const board: PageSchemaView = {
  configuration: { groupBy: 'status' },
  id: 'view-board',
  isDefault: true,
  name: 'Board',
  type: 'BOARD',
  version: 0,
};

describe('resolveActiveCollectionView', () => {
  it('opens the view the address asks for', () => {
    expect(resolveActiveCollectionView([table, board], 'Table')).toEqual(table);
  });

  it('falls back to the view marked as default when the address asks for nothing', () => {
    expect(resolveActiveCollectionView([table, board], null)).toEqual(board);
  });

  it('falls back to the first view when none is marked as default', () => {
    expect(resolveActiveCollectionView([table, { ...board, isDefault: false }], null)).toEqual(table);
  });

  it('falls back rather than showing nothing when the address names a view that is gone', () => {
    expect(resolveActiveCollectionView([table, board], 'Calendar')).toEqual(board);
  });

  it('has nothing to open when the collection has no views', () => {
    expect(resolveActiveCollectionView([], 'Table')).toBeNull();
  });
});

describe('buildCollectionViewHref', () => {
  it('names the view in the address', () => {
    expect(buildCollectionViewHref('Board')).toBe('?view=Board');
  });

  it('escapes a name that would otherwise break the address', () => {
    expect(buildCollectionViewHref('Por hacer & listo')).toBe('?view=Por+hacer+%26+listo');
  });

  it('carries the words searched, so the server reads only the rows that match', () => {
    expect(buildCollectionViewHref('Board', { search: 'informe anual' })).toBe('?view=Board&q=informe+anual');
  });

  it('leaves the words out of the address when there are none', () => {
    expect(buildCollectionViewHref('Board', { search: '   ' })).toBe('?view=Board');
  });

  it('carries the month a calendar shows after the words searched', () => {
    expect(buildCollectionViewHref('Calendar', { month: '2026-08', search: 'informe' })).toBe(
      '?view=Calendar&q=informe&month=2026-08',
    );
  });
});

describe('el filtro rápido en la dirección', () => {
  const quickFilter = {
    conditions: [{ kind: 'CONDITION', operator: 'CONTAINS', propertyKey: 'owner', value: '@me' }],
    kind: 'GROUP',
    operator: 'AND',
  } as const;

  it('carries the quick filter as JSON, after the words searched', () => {
    const href = buildCollectionViewHref('Board', { quickFilter, search: 'informe' });

    expect(href).toBe(
      `?view=Board&q=informe&filter=${encodeURIComponent(JSON.stringify(quickFilter)).replaceAll('%20', '+')}`,
    );
  });

  it('leaves it out when there is none', () => {
    expect(buildCollectionViewHref('Board', { quickFilter: null })).toBe('?view=Board');
  });

  it('reads back what it wrote', () => {
    expect(readCollectionQuickFilter(JSON.stringify(quickFilter))).toEqual(quickFilter);
  });

  it('reads nothing from an address that is not a filter, instead of failing the page', () => {
    expect(readCollectionQuickFilter(undefined)).toBeNull();
    expect(readCollectionQuickFilter('{not json')).toBeNull();
    expect(readCollectionQuickFilter('{"kind":"CONDITION","operator":"NOPE","propertyKey":"a","value":1}')).toBeNull();
    expect(readCollectionQuickFilter('x'.repeat(5000))).toBeNull();
  });
});

describe('readCollectionMonth', () => {
  it('reads a month of the address, and the first one when it repeats', () => {
    expect(readCollectionMonth('2026-08')).toBe('2026-08');
    expect(readCollectionMonth(['2026-09', '2026-10'])).toBe('2026-09');
  });

  it('reads nothing from something that is not a month, instead of failing the page', () => {
    expect(readCollectionMonth('2026-13')).toBeNull();
    expect(readCollectionMonth('agosto')).toBeNull();
    expect(readCollectionMonth(undefined)).toBeNull();
  });
});

describe('readCollectionSearch', () => {
  it('reads the words of the address trimmed, and the first ones when the parameter repeats', () => {
    expect(readCollectionSearch('  informe ')).toBe('informe');
    expect(readCollectionSearch(['uno', 'dos'])).toBe('uno');
  });

  it('reads nothing when the address has none', () => {
    expect(readCollectionSearch(undefined)).toBe('');
  });

  it('cuts words longer than the server accepts instead of failing the whole page', () => {
    expect(readCollectionSearch('a'.repeat(500))).toHaveLength(200);
  });
});
