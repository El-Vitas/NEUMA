import { describe, expect, it } from 'bun:test';
import { createViewWriteQueue } from '@/modules/pages/collections/lib/pages.view-writes.lib';
import type { PageViewWrite, ViewWriteSendResult } from '@/modules/pages/collections/types/pages.view-writes.types';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { createOutbox } from '@/modules/pages/local-cache/lib/local-cache.outbox.lib';
import type { CacheableBody } from '@/modules/pages/local-cache/types/local-cache.types';

const cell = (pageId: string, value: string): PageViewWrite => ({
  kind: 'cell',
  pageId,
  propertyValues: { status: value },
  spaceId: 'space-1',
});

const createFixture = (answers: ViewWriteSendResult[] = []) => {
  const bundle = createMemoryStorage<CacheableBody>();
  const outbox = createOutbox({ now: () => 5000, storage: bundle.outbox });
  const sent: PageViewWrite[] = [];
  const retries: (() => void)[] = [];
  let stamp = 0;
  const queue = createViewWriteQueue({
    collectionId: 'collection-1',
    newId: () => {
      stamp += 1;
      return `write-${String(stamp)}`;
    },
    outbox,
    ownerId: 'tab-1',
    scheduleRetry: (run) => {
      retries.push(run);
      return () => undefined;
    },
    send: async (write) => {
      sent.push(write);
      return answers.shift() ?? { kind: 'applied' };
    },
  });
  return { outbox, queue, retries, sent };
};

describe('createViewWriteQueue', () => {
  it('keeps a write on disk before it sends it, and forgets it once the server applied it', async () => {
    const { outbox, queue } = createFixture();
    const settled = queue.enqueue(cell('row-1', 'done'), 'Status of row-1: done');
    const pendingBeforeSend = (await outbox.listPending()).map((stored) => stored.id);

    expect(await settled).toEqual({ kind: 'applied' });
    expect(pendingBeforeSend).toEqual(['write-1']);
    expect(await outbox.listPending()).toEqual([]);
  });

  it('sends in the order the writes were made', async () => {
    const { queue, sent } = createFixture();

    await Promise.all([queue.enqueue(cell('row-1', 'a'), 'a'), queue.enqueue(cell('row-2', 'b'), 'b')]);

    expect(sent.map((write) => (write.kind === 'cell' ? write.pageId : ''))).toEqual(['row-1', 'row-2']);
  });

  it('keeps a write the network did not carry, says it is queued, and sends it again when asked to', async () => {
    const { outbox, queue, retries, sent } = createFixture([{ kind: 'offline' }]);

    const settled = await queue.enqueue(cell('row-1', 'done'), 'Status of row-1: done');

    expect(settled).toEqual({ kind: 'queued' });
    expect((await outbox.listPending()).map((stored) => stored.id)).toEqual(['write-1']);
    expect(queue.pendingCount()).toBe(1);
    expect(retries).toHaveLength(1);

    retries[0]?.();
    await queue.resume();

    expect(sent).toHaveLength(2);
    expect(await outbox.listPending()).toEqual([]);
    expect(queue.pendingCount()).toBe(0);
  });

  it('sends the same write with the same id every time', async () => {
    const { outbox, queue } = createFixture([{ kind: 'offline' }]);

    await queue.enqueue(cell('row-1', 'done'), 'a');
    const [first] = await outbox.listPending();
    await queue.resume();

    expect(first?.id).toBe('write-1');
    expect(first?.kind).toBe('view-write');
    expect(first?.pageId).toBe('collection-1');
  });

  it('sets a refused write aside with why and text, without dropping it, and goes on with the next', async () => {
    const { outbox, queue } = createFixture([{ cause: 'forbidden', kind: 'rejected', message: 'no permission' }]);

    const refused = await queue.enqueue(cell('row-1', 'done'), 'Status of row-1: done');
    const next = await queue.enqueue(cell('row-2', 'done'), 'Status of row-2: done');

    expect(refused).toEqual({ cause: 'forbidden', kind: 'rejected', message: 'no permission' });
    expect(next).toEqual({ kind: 'applied' });
    expect(await outbox.listPending()).toEqual([]);
    const [rejected] = await outbox.listRejected();
    expect(rejected?.cause).toBe('forbidden');
    expect(rejected?.previews[0]?.text).toBe('Status of row-1: done');
  });

  it('sends again, after a restart, what the disk still holds', async () => {
    const first = createFixture([{ kind: 'offline' }]);
    await first.queue.enqueue(cell('row-1', 'done'), 'a');
    const bundle = createMemoryStorage<CacheableBody>();
    for (const stored of await first.outbox.listPending()) await bundle.outbox.appendTransaction(stored);
    const sent: PageViewWrite[] = [];
    const restarted = createViewWriteQueue({
      collectionId: 'collection-1',
      newId: () => 'write-9',
      outbox: createOutbox({ now: () => 6000, storage: bundle.outbox }),
      ownerId: 'tab-2',
      scheduleRetry: () => () => undefined,
      send: async (write) => {
        sent.push(write);
        return { kind: 'applied' };
      },
    });

    await restarted.resume();

    expect(sent).toEqual([cell('row-1', 'done')]);
  });

  it('leaves alone the writes of other collections and the ones the editor kept', async () => {
    const bundle = createMemoryStorage<CacheableBody>();
    const outbox = createOutbox({ now: () => 5000, storage: bundle.outbox });
    const base = { attempts: 0, createdAt: 1, ownerId: 'tab', previews: [], spaceId: 'space-1' };
    await outbox.append({
      ...base,
      id: 'other',
      kind: 'view-write',
      operations: [cell('r', 'x')],
      pageId: 'collection-2',
    });
    await outbox.append({ ...base, id: 'editor', operations: [{ command: 'set' }], pageId: 'collection-1' });
    const sent: PageViewWrite[] = [];
    const queue = createViewWriteQueue({
      collectionId: 'collection-1',
      newId: () => 'write-1',
      outbox,
      ownerId: 'tab-1',
      scheduleRetry: () => () => undefined,
      send: async (write) => {
        sent.push(write);
        return { kind: 'applied' };
      },
    });

    await queue.resume();

    expect(sent).toEqual([]);
    expect((await outbox.listPending()).map((stored) => stored.id).sort()).toEqual(['editor', 'other']);
  });

  it('sets aside a write on disk that is not one this code wrote, instead of sending anything', async () => {
    const bundle = createMemoryStorage<CacheableBody>();
    const outbox = createOutbox({ now: () => 5000, storage: bundle.outbox });
    await outbox.append({
      attempts: 0,
      createdAt: 1,
      id: 'broken',
      kind: 'view-write',
      operations: [{ kind: 'unknown' }],
      ownerId: 'tab',
      pageId: 'collection-1',
      previews: [],
      spaceId: 'space-1',
    });
    const sent: PageViewWrite[] = [];
    const queue = createViewWriteQueue({
      collectionId: 'collection-1',
      newId: () => 'write-1',
      outbox,
      ownerId: 'tab-1',
      scheduleRetry: () => () => undefined,
      send: async (write) => {
        sent.push(write);
        return { kind: 'applied' };
      },
    });

    await queue.resume();

    expect(sent).toEqual([]);
    expect((await outbox.listRejected()).map((stored) => stored.id)).toEqual(['broken']);
  });
});
