import { describe, expect, it } from 'bun:test';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { createOutbox } from '@/modules/pages/local-cache/lib/local-cache.outbox.lib';
import type { CacheableBody, StoredTransaction } from '@/modules/pages/local-cache/types/local-cache.types';

const transaction = (id: string, createdAt: number): StoredTransaction => ({
  attempts: 0,
  createdAt,
  id,
  operations: [{ command: 'update' }],
  ownerId: 'tab-1',
  pageId: 'page-1',
  previews: [{ blockId: 'b1', property: 'title', text: 'hello' }],
  spaceId: 'space-1',
});

const createFixture = () => {
  const bundle = createMemoryStorage<CacheableBody>();
  return createOutbox({ now: () => 9000, storage: bundle.outbox });
};

describe('createOutbox', () => {
  it('lists pending writes in the order they were made', async () => {
    const outbox = createFixture();
    await outbox.append(transaction('later', 20));
    await outbox.append(transaction('first', 10));
    expect((await outbox.listPending()).map((pending) => pending.id)).toEqual(['first', 'later']);
  });

  it('removes a write once the server answered it', async () => {
    const outbox = createFixture();
    await outbox.append(transaction('t1', 1));
    await outbox.remove('t1');
    expect(await outbox.listPending()).toEqual([]);
  });

  it('moves a refused write to the rejected list with its text, not dropping it', async () => {
    const outbox = createFixture();
    await outbox.append(transaction('t1', 1));
    await outbox.markRejected('t1', 'forbidden', 'no permission');
    expect(await outbox.listPending()).toEqual([]);
    const [rejected] = await outbox.listRejected();
    expect(rejected?.id).toBe('t1');
    expect(rejected?.cause).toBe('forbidden');
    expect(rejected?.rejectedAt).toBe(9000);
    expect(rejected?.previews).toEqual([{ blockId: 'b1', property: 'title', text: 'hello' }]);
  });

  it('ignores a rejection for a write it does not hold', async () => {
    const outbox = createFixture();
    await outbox.markRejected('missing', 'other', 'x');
    expect(await outbox.listRejected()).toEqual([]);
  });

  it('puts a refused write back among the pending ones, as it was made, when the person asks to try again', async () => {
    const outbox = createFixture();
    await outbox.append(transaction('t1', 7));
    await outbox.markRejected('t1', 'other', 'unexpected');

    await outbox.retryRejected('t1');

    expect(await outbox.listRejected()).toEqual([]);
    expect(await outbox.listPending()).toEqual([transaction('t1', 7)]);
  });

  it('ignores a retry for a refused write it does not hold', async () => {
    const outbox = createFixture();
    await outbox.retryRejected('missing');
    expect(await outbox.listPending()).toEqual([]);
  });

  it('forgets a rejected write only when the person discards it', async () => {
    const outbox = createFixture();
    await outbox.append(transaction('t1', 1));
    await outbox.markRejected('t1', 'invalid', 'bad');
    await outbox.discardRejected('t1');
    expect(await outbox.listRejected()).toEqual([]);
  });
});
