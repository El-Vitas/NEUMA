import { describe, expect, it } from 'bun:test';
import { collectRowPages } from '@/modules/pages/collections/lib/pages.rows-collecting.lib';
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

/** A collection of rows served in pages of three, the cursor being the position the next page starts at. */
const serve = (total: number, calls: (string | undefined)[] = []) => {
  const all = Array.from({ length: total }, (_unused, position) => rowOf(`row-${String(position)}`));
  return async (cursor: string | undefined) => {
    calls.push(cursor);
    const from = cursor === undefined ? 0 : Number(cursor);
    const rows = all.slice(from, from + 3);
    return { nextCursor: from + 3 < total ? String(from + 3) : null, rows };
  };
};

describe('collectRowPages', () => {
  it('reads every page until the server has no more', async () => {
    const collected = await collectRowPages({ readPage: serve(7), wanted: 100 });

    expect(collected?.rows.map((row) => row.id)).toEqual(Array.from({ length: 7 }, (_u, i) => `row-${String(i)}`));
    expect(collected?.nextCursor).toBeNull();
  });

  it('stops at the amount wanted and says where it left off', async () => {
    const calls: (string | undefined)[] = [];

    const collected = await collectRowPages({ readPage: serve(20, calls), wanted: 7 });

    expect(collected?.rows).toHaveLength(9);
    expect(collected?.nextCursor).toBe('9');
    expect(calls).toEqual([undefined, '3', '6']);
  });

  it('tells each page how many rows are still missing, so the last one does not overshoot', async () => {
    const missing: number[] = [];
    const pages = serve(20);

    const collected = await collectRowPages({
      readPage: async (cursor, remaining) => {
        missing.push(remaining);
        return pages(cursor);
      },
      wanted: 7,
    });

    expect(missing).toEqual([7, 4, 1]);
    expect(collected?.rows).toHaveLength(9);
  });

  it('continues from a cursor it is given', async () => {
    const collected = await collectRowPages({ readPage: serve(10), startCursor: '6', wanted: 100 });

    expect(collected?.rows.map((row) => row.id)).toEqual(['row-6', 'row-7', 'row-8', 'row-9']);
  });

  it('answers null when a page cannot be read, instead of passing off half of the rows as all of them', async () => {
    let calls = 0;
    const failing = async (cursor: string | undefined) => {
      calls += 1;
      return calls === 2 ? null : serve(20)(cursor);
    };

    expect(await collectRowPages({ readPage: failing, wanted: 100 })).toBeNull();
  });

  it('never repeats a row two pages both carried', async () => {
    const overlapping = async (cursor: string | undefined) =>
      cursor === undefined
        ? { nextCursor: 'next', rows: [rowOf('a'), rowOf('b')] }
        : { nextCursor: null, rows: [rowOf('b'), rowOf('c')] };

    const collected = await collectRowPages({ readPage: overlapping, wanted: 100 });

    expect(collected?.rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });
});
