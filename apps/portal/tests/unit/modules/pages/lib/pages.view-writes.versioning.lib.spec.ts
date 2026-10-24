import { describe, expect, it } from 'bun:test';
import { createExpectedVersionStamper } from '@/modules/pages/collections/lib/pages.view-writes.versioning.lib';
import type { PageViewWrite } from '@/modules/pages/collections/types/pages.view-writes.types';

const cell = (pageId: string): PageViewWrite => ({
  kind: 'cell',
  pageId,
  propertyValues: { status: 'done' },
  spaceId: 'space-1',
});

const cellAt = (pageId: string, expectedVersion: number): PageViewWrite => ({
  expectedVersion,
  kind: 'cell',
  pageId,
  propertyValues: { status: 'done' },
  spaceId: 'space-1',
});

describe('createExpectedVersionStamper', () => {
  it('puts the version the row had when it was edited on the write', () => {
    const stamp = createExpectedVersionStamper();

    expect(stamp(cell('row-1'), 5)).toEqual(cellAt('row-1', 5));
  });

  it('sends nothing for a row the server has not confirmed or one the browser does not hold', () => {
    const stamp = createExpectedVersionStamper();

    expect(stamp(cell('row-1'), 0)).toEqual(cell('row-1'));
    expect(stamp(cell('row-2'), undefined)).toEqual(cell('row-2'));
  });

  it('does not hold a second edit against the version its own first edit has already moved', () => {
    const stamp = createExpectedVersionStamper();
    stamp(cell('row-1'), 5);

    expect(stamp(cell('row-1'), 5)).toEqual(cell('row-1'));
    expect(stamp(cell('row-1'), 6)).toEqual(cellAt('row-1', 6));
  });

  it('leaves a new row alone', () => {
    const stamp = createExpectedVersionStamper();
    const created: PageViewWrite = {
      content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
      id: '0b9c9d2e-5d1a-4f10-9a7c-3a3c5b7a1f00',
      kind: 'create',
      parentId: 'collection-1',
      spaceId: 'space-1',
      title: 'New',
    };

    expect(stamp(created, 3)).toEqual(created);
  });
});
