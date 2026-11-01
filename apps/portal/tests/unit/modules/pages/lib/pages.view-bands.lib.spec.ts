import { describe, expect, it } from 'bun:test';
import { readViewBands } from '@/modules/pages/collections/lib/pages.view-bands.lib';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';

const rowOf = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: null,
  spaceId: 'space-1',
  title: id,
});

describe('readViewBands', () => {
  it('makes rows that are not grouped one band with one unnamed group, with the cursor that continues them', () => {
    const bands = readViewBands({ kind: 'FLAT_ROWS', nextCursor: 'more', rows: [rowOf('a')] });

    expect(bands).toEqual([
      {
        color: null,
        groups: [{ color: null, key: '', label: '', nextCursor: 'more', rows: [rowOf('a')] }],
        key: '',
        label: '',
      },
    ]);
  });

  it('makes rows read to their end a group that has nothing more to load', () => {
    const bands = readViewBands({ kind: 'FLAT_ROWS', rows: [] });

    expect(bands[0]?.groups[0]?.nextCursor).toBeNull();
  });

  it('makes grouped rows one unnamed band of columns', () => {
    const group = { color: null, key: 'todo', label: 'todo', nextCursor: null, rows: [rowOf('a')] };

    expect(readViewBands({ groups: [group], kind: 'GROUPED_ROWS' })).toEqual([
      { color: null, groups: [group], key: '', label: '' },
    ]);
  });

  it('keeps the bands of rows crossed by two groupings', () => {
    const band = {
      color: null,
      groups: [{ color: null, key: 'todo', label: 'todo', nextCursor: null, rows: [] }],
      key: 'bug',
      label: 'bug',
    };

    expect(readViewBands({ bands: [band], kind: 'BANDED_ROWS' })).toEqual([band]);
  });
});
