import { describe, expect, it } from 'bun:test';
import { forgetRevokedRows } from '@/modules/pages/collections/lib/pages.cache-revocation.lib';
import type { CachedRowBody } from '@/modules/pages/collections/types/pages.view-cache.types';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { openLocalCache } from '@/modules/pages/local-cache/lib/local-cache.store.lib';

const bodyOf = (id: string, version: number): CachedRowBody => ({
  id,
  row: {
    id,
    lifecycle: 'ACTIVE',
    order: 0,
    parentId: 'collection-1',
    propertyValues: null,
    spaceId: 'space-1',
    title: id,
    version,
  },
  spaceId: 'space-1',
  version,
});

const openCache = async () =>
  openLocalCache({
    budgetBytes: 1_000_000,
    now: Date.now,
    storage: createMemoryStorage<CachedRowBody>().cache,
    userId: 'user-1',
  });

describe('forgetRevokedRows', () => {
  it('asks the server about the rows the cache holds with the versions it holds them at', async () => {
    const cache = await openCache();
    await cache.saveRecords([bodyOf('a', 4), bodyOf('b', 9)]);
    const asked: (readonly { id: string; version: number }[])[] = [];

    await forgetRevokedRows({
      cache,
      droppedIds: ['a', 'b', 'never-held'],
      readRevoked: (held) => {
        asked.push(held);
        return Promise.resolve([]);
      },
    });

    expect(asked).toEqual([
      [
        { id: 'a', version: 4 },
        { id: 'b', version: 9 },
      ],
    ]);
  });

  it('forgets the rows the server says the reader may no longer open, and keeps the others', async () => {
    const cache = await openCache();
    await cache.saveRecords([bodyOf('a', 1), bodyOf('b', 1)]);

    await forgetRevokedRows({ cache, droppedIds: ['a', 'b'], readRevoked: () => Promise.resolve(['a']) });

    expect(cache.readRecord('a')).toBeNull();
    expect(cache.readRecord('b')).not.toBeNull();
  });

  it('asks nothing when no row was dropped', async () => {
    const cache = await openCache();
    let calls = 0;

    await forgetRevokedRows({
      cache,
      droppedIds: [],
      readRevoked: () => {
        calls += 1;
        return Promise.resolve([]);
      },
    });

    expect(calls).toBe(0);
  });

  it('keeps everything when the server cannot be asked, since nothing is known', async () => {
    const cache = await openCache();
    await cache.saveRecords([bodyOf('a', 1)]);

    await forgetRevokedRows({ cache, droppedIds: ['a'], readRevoked: () => Promise.resolve(null) });

    expect(cache.readRecord('a')).not.toBeNull();
  });

  it('asks in batches no bigger than the server accepts', async () => {
    const cache = await openCache();
    const bodies = Array.from({ length: 1200 }, (_unused, index) => bodyOf(`r${String(index)}`, 1));
    await cache.saveRecords(bodies);
    const sizes: number[] = [];

    await forgetRevokedRows({
      cache,
      droppedIds: bodies.map((body) => body.id),
      readRevoked: (held) => {
        sizes.push(held.length);
        return Promise.resolve([]);
      },
    });

    expect(sizes).toEqual([500, 500, 200]);
  });
});
