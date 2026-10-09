import { describe, expect, it } from 'bun:test';
import {
  buildCollectionViewHref,
  resolveActiveCollectionView,
} from '@/modules/pages/collections/lib/pages.collection.view-selection.lib';
import type { PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';

const table: PageSchemaView = { configuration: {}, isDefault: false, name: 'Table', type: 'TABLE' };
const board: PageSchemaView = { configuration: { groupBy: 'status' }, isDefault: true, name: 'Board', type: 'BOARD' };

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
});
