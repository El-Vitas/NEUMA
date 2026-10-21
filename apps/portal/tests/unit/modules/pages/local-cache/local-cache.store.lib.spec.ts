import { describe, expect, it } from 'bun:test';
import type { SyncedBlock } from '@/modules/pages/block-sync/types/block-sync.types';
import {
  LOCAL_CACHE_VALIDATION_MAXIMUM_AGE_MS,
  LOCAL_CACHE_VERSION,
} from '@/modules/pages/local-cache/constants/local-cache.constants';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { createOutbox } from '@/modules/pages/local-cache/lib/local-cache.outbox.lib';
import { openLocalCache } from '@/modules/pages/local-cache/lib/local-cache.store.lib';
import type { LocalStorageBundle, StoredTransaction } from '@/modules/pages/local-cache/types/local-cache.types';

const DAY_MS = 86_400_000;

const block = (id: string, version: number, overrides: Partial<SyncedBlock> = {}): SyncedBlock => ({
  alive: true,
  children: [],
  format: {},
  id,
  parentId: 'collection',
  properties: { title: id },
  role: 'EDITOR',
  spaceId: 'space-1',
  textState: null,
  type: 'page',
  version,
  ...overrides,
});

const transaction = (id: string): StoredTransaction => ({
  attempts: 0,
  createdAt: 1,
  id,
  operations: [],
  ownerId: 'tab-1',
  pageId: 'page-1',
  previews: [],
  spaceId: 'space-1',
});

const open = (bundle: LocalStorageBundle<SyncedBlock>, userId = 'user-1', now = 1_000_000, budgetBytes = 1_000_000) =>
  openLocalCache({ budgetBytes, now: () => now, storage: bundle.cache, userId });

const resultInput = (key: string, ids: readonly string[]) => ({
  changesCursor: 'cursor-1',
  collectionId: 'collection',
  ids,
  key,
  layout: '{}',
  schemaVersion: 1,
  total: ids.length,
  viewVersion: 1,
});

describe('openLocalCache records', () => {
  it('keeps the record with the higher version and ignores an older one', async () => {
    const cache = await open(createMemoryStorage());
    await cache.saveRecords([block('a', 5)]);
    await cache.saveRecords([block('a', 3, { properties: { title: 'old' } })]);
    expect(cache.readRecord('a')?.version).toBe(5);
    await cache.saveRecords([block('a', 6, { properties: { title: 'new' } })]);
    expect(cache.readRecord('a')?.properties).toEqual({ title: 'new' });
  });

  it('replaces a record at the same version when the role changed', async () => {
    const cache = await open(createMemoryStorage());
    await cache.saveRecords([block('a', 5)]);
    await cache.saveRecords([block('a', 5, { role: 'VIEWER' })]);
    expect(cache.readRecord('a')?.role).toBe('VIEWER');
  });

  it('restores what was saved when it is opened again', async () => {
    const bundle = createMemoryStorage<SyncedBlock>();
    const first = await open(bundle);
    await first.saveRecords([block('a', 2)]);
    await first.saveResult(resultInput('view-1', ['a']));
    const second = await open(bundle);
    expect(second.readRecord('a')?.version).toBe(2);
    expect(second.readResult('view-1')?.records.map((record) => record.id)).toEqual(['a']);
  });
});

describe('openLocalCache results', () => {
  it('is a miss when a cited record is not held', async () => {
    const cache = await open(createMemoryStorage());
    await cache.saveRecords([block('a', 1)]);
    await cache.saveResult(resultInput('view-1', ['a', 'b']));
    expect(cache.readResult('view-1')).toBeNull();
  });

  it('keeps the order of the ids', async () => {
    const cache = await open(createMemoryStorage());
    await cache.saveRecords([block('a', 1), block('b', 1), block('c', 1)]);
    await cache.saveResult(resultInput('view-1', ['c', 'a', 'b']));
    expect(cache.readResult('view-1')?.records.map((record) => record.id)).toEqual(['c', 'a', 'b']);
  });

  it('moves the cursor and the validation time when revalidated', async () => {
    const cache = await open(createMemoryStorage(), 'user-1', 5000);
    await cache.saveRecords([block('a', 1)]);
    await cache.saveResult(resultInput('view-1', ['a']));
    await cache.validateResult('view-1', 'cursor-2');
    expect(cache.readResult('view-1')?.result.changesCursor).toBe('cursor-2');
    expect(cache.readResult('view-1')?.result.validatedAt).toBe(5000);
  });

  it('drops a result that was not validated for 30 days when opened', async () => {
    const bundle = createMemoryStorage<SyncedBlock>();
    const first = await open(bundle, 'user-1', 1000);
    await first.saveRecords([block('a', 1)]);
    await first.saveResult(resultInput('view-1', ['a']));
    const later = await open(bundle, 'user-1', 1000 + LOCAL_CACHE_VALIDATION_MAXIMUM_AGE_MS + DAY_MS);
    expect(later.readResult('view-1')).toBeNull();
  });
});

describe('openLocalCache purging', () => {
  it('removes a record and every result that cites it', async () => {
    const bundle = createMemoryStorage<SyncedBlock>();
    const cache = await open(bundle);
    await cache.saveRecords([block('a', 1), block('b', 1)]);
    await cache.saveResult(resultInput('view-1', ['a', 'b']));
    await cache.saveResult(resultInput('view-2', ['b']));
    await cache.purgeRecords(['a']);
    expect(cache.readRecord('a')).toBeNull();
    expect(cache.readResult('view-1')).toBeNull();
    expect(cache.readResult('view-2')?.records).toHaveLength(1);
    expect((await bundle.cache.listRecords()).map((record) => record.body.id)).toEqual(['b']);
    expect((await bundle.cache.listResults()).map((result) => result.key)).toEqual(['view-2']);
  });

  it('removes everything of a space', async () => {
    const cache = await open(createMemoryStorage());
    await cache.saveRecords([block('a', 1), block('b', 1, { spaceId: 'space-2' })]);
    await cache.purgeSpace('space-2');
    expect(cache.readRecord('b')).toBeNull();
    expect(cache.readRecord('a')).not.toBeNull();
  });
});

describe('openLocalCache owner and version', () => {
  it('wipes everything, pending writes included, when another user opens it', async () => {
    const bundle = createMemoryStorage<SyncedBlock>();
    const first = await open(bundle, 'user-1');
    await first.saveRecords([block('a', 1)]);
    await createOutbox({ now: () => 1, storage: bundle.outbox }).append(transaction('t1'));
    const second = await open(bundle, 'user-2');
    expect(second.readRecord('a')).toBeNull();
    expect(await bundle.outbox.listTransactions()).toEqual([]);
    expect((await bundle.cache.readMeta())?.userId).toBe('user-2');
  });

  it('drops the cache but keeps the pending writes when the cache version changed', async () => {
    const bundle = createMemoryStorage<SyncedBlock>();
    const first = await open(bundle);
    await first.saveRecords([block('a', 1)]);
    await createOutbox({ now: () => 1, storage: bundle.outbox }).append(transaction('t1'));
    await bundle.cache.writeMeta({ cacheVersion: LOCAL_CACHE_VERSION - 1, userId: 'user-1' });
    const second = await open(bundle);
    expect(second.readRecord('a')).toBeNull();
    expect((await bundle.outbox.listTransactions()).map((pending) => pending.id)).toEqual(['t1']);
  });

  it('wipe leaves the storage empty', async () => {
    const bundle = createMemoryStorage<SyncedBlock>();
    const cache = await open(bundle);
    await cache.saveRecords([block('a', 1)]);
    await cache.wipe();
    expect(await bundle.cache.listRecords()).toEqual([]);
    expect(await bundle.cache.readMeta()).toBeNull();
  });
});

describe('openLocalCache budget', () => {
  it('evicts the least recently used result and the records only it cites', async () => {
    let now = 1000;
    const bundle = createMemoryStorage<SyncedBlock>();
    const cache = await openLocalCache({ budgetBytes: 1, now: () => now, storage: bundle.cache, userId: 'user-1' });
    await cache.saveRecords([block('a', 1), block('b', 1)]);
    now = 2000;
    await cache.saveResult(resultInput('old', ['a']));
    now = 3000;
    await cache.saveResult(resultInput('recent', ['b']));
    const evicted = await cache.enforceBudget(new Set(['recent']));
    expect(evicted).toEqual(['old']);
    expect(cache.readRecord('a')).toBeNull();
    expect(cache.readRecord('b')).not.toBeNull();
  });
});
