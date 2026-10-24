import { describe, expect, it } from 'bun:test';
import { BLOCK_SYNC_FORBIDDEN_ERROR_CODES } from '@/modules/pages/block-sync/constants/block-sync.constants';
import { buildSetOperation } from '@/modules/pages/block-sync/lib/block-sync.operations.lib';
import {
  createBlockSyncOutbox,
  createDeferredBlockSyncOutbox,
} from '@/modules/pages/block-sync/lib/block-sync.outbox.lib';
import type { BlockTransaction } from '@/modules/pages/block-sync/types/block-sync.types';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { createOutbox } from '@/modules/pages/local-cache/lib/local-cache.outbox.lib';
import type { CacheableBody, Outbox } from '@/modules/pages/local-cache/types/local-cache.types';

const transaction = (id: string): BlockTransaction => ({
  id,
  operations: [buildSetOperation(id, { id })],
  spaceId: 'space-1',
});

const createFixture = (pageId = 'page-1', ownerId = 'tab-1') => {
  const bundle = createMemoryStorage<CacheableBody>();
  const outbox = createOutbox({ now: () => 5000, storage: bundle.outbox });
  const reported: string[] = [];
  const blockOutbox = createBlockSyncOutbox({
    outbox,
    ownerId,
    pageId,
    report: (message) => reported.push(message),
  });
  return { blockOutbox, outbox, reported };
};

describe('createBlockSyncOutbox', () => {
  it('keeps a transaction with the page and the tab that sends it, and reads it back', async () => {
    const { blockOutbox } = createFixture();

    await blockOutbox.keep(transaction('t1'), []);

    expect(await blockOutbox.restore()).toEqual([transaction('t1')]);
  });

  it('reads back in the order the transactions were kept', async () => {
    const { blockOutbox } = createFixture();

    await blockOutbox.keep(transaction('t1'), []);
    await blockOutbox.keep(transaction('t2'), []);
    await blockOutbox.keep(transaction('t3'), []);

    expect((await blockOutbox.restore()).map((restored) => restored.id)).toEqual(['t1', 't2', 't3']);
  });

  it('reads back only the transactions of its own page', async () => {
    const first = createFixture('page-1');
    await first.blockOutbox.keep(transaction('mine'), []);
    const other = createBlockSyncOutbox({
      outbox: first.outbox,
      ownerId: 'tab-2',
      pageId: 'page-2',
      report: () => undefined,
    });
    await other.keep(transaction('theirs'), []);

    expect((await first.blockOutbox.restore()).map((restored) => restored.id)).toEqual(['mine']);
  });

  it('leaves alone the writes a view kept for its own queue, though they belong to the same page', async () => {
    const { blockOutbox, outbox, reported } = createFixture('page-1');
    await outbox.append({
      attempts: 0,
      createdAt: 1,
      id: 'view-write',
      kind: 'view-write',
      operations: [{ kind: 'cell' }],
      ownerId: 'tab-1',
      pageId: 'page-1',
      previews: [],
      spaceId: 'space-1',
    });
    await blockOutbox.keep(transaction('t1'), []);

    expect((await blockOutbox.restore()).map((restored) => restored.id)).toEqual(['t1']);
    expect(reported).toEqual([]);
    expect(await outbox.listRejected()).toEqual([]);
  });

  it('forgets a transaction the server answered', async () => {
    const { blockOutbox } = createFixture();
    await blockOutbox.keep(transaction('t1'), []);

    await blockOutbox.drop('t1');

    expect(await blockOutbox.restore()).toEqual([]);
  });

  it('sets a refused transaction aside with why, and does not read it back', async () => {
    const { blockOutbox, outbox } = createFixture();
    const forbidden = BLOCK_SYNC_FORBIDDEN_ERROR_CODES[0] ?? 'FORBIDDEN';
    await blockOutbox.keep(transaction('t1'), []);

    await blockOutbox.setAside(transaction('t1'), { code: forbidden, message: 'no permission' });

    expect(await blockOutbox.restore()).toEqual([]);
    const [aside] = await outbox.listRejected();
    expect([aside?.id, aside?.cause, aside?.message]).toEqual(['t1', 'forbidden', 'no permission']);
  });

  it('sets aside, and says so, a stored transaction it cannot read, instead of dropping it', async () => {
    const { blockOutbox, outbox, reported } = createFixture();
    await outbox.append({
      attempts: 0,
      createdAt: 1,
      id: 'broken',
      operations: [{ not: 'an operation' }],
      ownerId: 'tab-1',
      pageId: 'page-1',
      previews: [],
      spaceId: 'space-1',
    });

    expect(await blockOutbox.restore()).toEqual([]);
    expect((await outbox.listRejected()).map((aside) => [aside.id, aside.cause])).toEqual([['broken', 'invalid']]);
    expect(reported).toHaveLength(1);
  });

  it('keeps the words of a transaction, so what a refusal held can still be shown', async () => {
    const { blockOutbox, outbox } = createFixture();
    const words = [{ blockId: 'block-1', property: 'title', text: 'Hola, esto lo escribí sin conexión' }];
    await blockOutbox.keep(transaction('t1'), words);

    await blockOutbox.setAside(transaction('t1'), { code: 'FORBIDDEN', message: 'no' });

    expect((await outbox.listRejected())[0]?.previews).toEqual(words);
  });

  it('tells whoever shows what was not applied when something is set aside', async () => {
    const { outbox } = createFixture();
    let told = 0;
    const blockOutbox = createBlockSyncOutbox({
      onSetAside: () => {
        told += 1;
      },
      outbox,
      ownerId: 'tab-1',
      pageId: 'page-1',
      report: () => undefined,
    });
    await blockOutbox.keep(transaction('t1'), []);

    await blockOutbox.setAside(transaction('t1'), { code: 'FORBIDDEN', message: 'no' });

    expect(told).toBe(1);
  });
});

describe('createDeferredBlockSyncOutbox', () => {
  it('keeps a transaction once the disk is open, even when it was asked before', async () => {
    const { outbox } = createFixture();
    let open: (value: Outbox) => void = () => undefined;
    const opening = new Promise<Outbox>((resolve) => {
      open = resolve;
    });
    const deferred = createDeferredBlockSyncOutbox({
      opening,
      ownerId: 'tab-1',
      pageId: 'page-1',
      report: () => undefined,
    });

    const kept = deferred.keep(transaction('t1'), []);
    expect(await outbox.listPending()).toEqual([]);
    open(outbox);
    await kept;

    expect((await deferred.restore()).map((restored) => restored.id)).toEqual(['t1']);
  });

  it('reports a disk that could not be opened and goes on without it', async () => {
    const reported: string[] = [];
    const deferred = createDeferredBlockSyncOutbox({
      opening: Promise.reject(new Error('no disk')),
      ownerId: 'tab-1',
      pageId: 'page-1',
      report: (message) => reported.push(message),
    });

    await deferred.keep(transaction('t1'), []);

    expect(await deferred.restore()).toEqual([]);
    expect(reported).toHaveLength(1);
  });
});
