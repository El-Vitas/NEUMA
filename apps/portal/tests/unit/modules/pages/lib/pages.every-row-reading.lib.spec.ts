import { describe, expect, it } from 'bun:test';
import { readEveryRow } from '@/modules/pages/collections/lib/pages.every-row-reading.lib';
import type { PageEveryRowRead } from '@/modules/pages/collections/types/pages.query.types';
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

const pageOf = (overrides: Partial<PageEveryRowRead>): PageEveryRowRead => ({
  attachedFiles: [],
  changesCursor: 'cursor',
  nextCursor: null,
  relatedRows: [],
  rows: [],
  ...overrides,
});

describe('readEveryRow', () => {
  it('reads page after page until the server has no more and joins the rows in order', async () => {
    const asked: (string | undefined)[] = [];
    const pages = [
      pageOf({ changesCursor: 'first', nextCursor: 'next-1', rows: [rowOf('a'), rowOf('b')] }),
      pageOf({ changesCursor: 'second', nextCursor: null, rows: [rowOf('c')] }),
    ];

    const read = await readEveryRow(async (cursor) => {
      asked.push(cursor);
      return pages.shift() ?? null;
    });

    expect(asked).toEqual([undefined, 'next-1']);
    expect(read?.rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the cursor taken before the first rows were read, so no change falls between them', async () => {
    const pages = [
      pageOf({ changesCursor: 'first', nextCursor: 'next-1', rows: [rowOf('a')] }),
      pageOf({ changesCursor: 'second', rows: [rowOf('b')] }),
    ];

    const read = await readEveryRow(async () => pages.shift() ?? null);

    expect(read?.changesCursor).toBe('first');
  });

  it('gives nothing when a page could not be read: half of a collection is not the collection', async () => {
    const pages = [pageOf({ nextCursor: 'next-1', rows: [rowOf('a')] }), null];

    const read = await readEveryRow(async () => pages.shift() ?? null);

    expect(read).toBeNull();
  });

  it('does not repeat a row that two pages both carry, and joins what the rows need to be drawn', async () => {
    const pages = [
      pageOf({
        attachedFiles: [{ id: 'f1', mimeType: 'image/png', name: 'a.png', size: 1 }],
        nextCursor: 'next-1',
        relatedRows: [{ id: 'r1', title: 'Related' }],
        rows: [rowOf('a')],
      }),
      pageOf({
        attachedFiles: [{ id: 'f1', mimeType: 'image/png', name: 'a.png', size: 1 }],
        rows: [rowOf('a'), rowOf('b')],
      }),
    ];

    const read = await readEveryRow(async () => pages.shift() ?? null);

    expect(read?.rows.map((row) => row.id)).toEqual(['a', 'b']);
    expect(read?.attachedFiles).toHaveLength(1);
    expect(read?.relatedRows).toHaveLength(1);
  });

  it('stops at the most pages a client mode collection can take', async () => {
    const read = await readEveryRow(async () => pageOf({ nextCursor: 'again', rows: [rowOf('a')] }));

    expect(read).toBeNull();
  });
});
