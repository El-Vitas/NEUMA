import { describe, expect, it } from 'bun:test';
import { toOptimisticRows } from '@/modules/pages/collections/lib/pages.view-writes.optimistic.lib';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';
import type { PageViewWrite } from '@/modules/pages/collections/types/pages.view-writes.types';

const held: PageRow = {
  id: 'row-1',
  lifecycle: 'ACTIVE',
  version: 5,
  order: 0,
  parentId: 'collection-1',
  propertyValues: { points: 3, status: 'todo' },
  spaceId: 'space-1',
  title: 'First',
};

describe('toOptimisticRows', () => {
  it('puts the written value in the row it is written to, and keeps the rest', () => {
    const write: PageViewWrite = {
      kind: 'cell',
      pageId: 'row-1',
      propertyValues: { status: 'done' },
      spaceId: 'space-1',
    };

    expect(toOptimisticRows(write, held)).toEqual([{ ...held, propertyValues: { points: 3, status: 'done' } }]);
  });

  it('takes a value away when the write clears it', () => {
    const write: PageViewWrite = {
      kind: 'cell',
      pageId: 'row-1',
      propertyValues: { points: null },
      spaceId: 'space-1',
    };

    expect(toOptimisticRows(write, held)[0]?.propertyValues).toEqual({ status: 'todo' });
  });

  it('shows nothing of a write to a row the browser does not hold', () => {
    const write: PageViewWrite = {
      kind: 'cell',
      pageId: 'far',
      propertyValues: { status: 'done' },
      spaceId: 'space-1',
    };

    expect(toOptimisticRows(write, undefined)).toEqual([]);
  });

  it('puts the values of a move in the row that moved', () => {
    const write: PageViewWrite = {
      kind: 'move',
      listChanges: {},
      pageId: 'collection-1',
      rowId: 'row-1',
      spaceId: 'space-1',
      values: { status: 'done' },
      viewId: 'view-1',
    };

    expect(toOptimisticRows(write, held)[0]?.propertyValues).toEqual({ points: 3, status: 'done' });
  });

  it('makes a row of a new page, with its title and the values it starts with', () => {
    const write: PageViewWrite = {
      content: { content: [], schemaVersion: 1, type: 'doc' },
      defaultValues: { points: 0 },
      id: '0b9c9d2e-5d1a-4f10-9a7c-3a3c5b7a1f00',
      kind: 'create',
      parentId: 'collection-1',
      propertyValues: { status: 'todo' },
      spaceId: 'space-1',
      title: 'Brand new',
    };

    expect(toOptimisticRows(write, undefined)).toEqual([
      {
        id: '0b9c9d2e-5d1a-4f10-9a7c-3a3c5b7a1f00',
        lifecycle: 'ACTIVE',
        version: 0,
        order: 0,
        parentId: 'collection-1',
        propertyValues: { points: 0, status: 'todo' },
        spaceId: 'space-1',
        title: 'Brand new',
      },
    ]);
  });
});
