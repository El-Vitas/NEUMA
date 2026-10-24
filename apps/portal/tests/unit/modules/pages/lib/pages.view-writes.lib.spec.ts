import { describe, expect, it } from 'bun:test';
import { VIEW_WRITE_MAXIMUM_ATTEMPTS } from '@/modules/pages/collections/constants/pages.view-writes.constants';
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

  it('keeps the whole backlog queued when the server fails, instead of refusing every write', async () => {
    const failure: ViewWriteSendResult = { cause: 'other', kind: 'retry', message: 'unexpected' };
    const { outbox, queue, retries, sent } = createFixture([failure]);

    const first = await queue.enqueue(cell('row-1', 'a'), 'a');

    expect(first).toEqual({ kind: 'queued' });
    expect(sent).toHaveLength(1);
    expect(retries).toHaveLength(1);
    expect((await outbox.listPending()).map((stored) => stored.id)).toEqual(['write-1']);
    expect(await outbox.listRejected()).toEqual([]);

    await queue.resume();
    expect(await outbox.listPending()).toEqual([]);
  });

  it('sets a write aside only after the server kept failing past the cap', async () => {
    const failure: ViewWriteSendResult = { cause: 'other', kind: 'retry', message: 'unexpected' };
    const { outbox, queue } = createFixture(Array.from({ length: 10 }, () => failure));

    await queue.enqueue(cell('row-1', 'a'), 'a');
    for (let attempt = 0; attempt < VIEW_WRITE_MAXIMUM_ATTEMPTS; attempt += 1) await queue.resume();

    expect(await outbox.listPending()).toEqual([]);
    expect((await outbox.listRejected()).map((stored) => stored.id)).toEqual(['write-1']);
  });

  it('sends again a refused write the person put back', async () => {
    const { outbox, queue, sent } = createFixture([{ cause: 'invalid', kind: 'rejected', message: 'invalid' }]);
    await queue.enqueue(cell('row-1', 'a'), 'a');

    await outbox.retryRejected('write-1');
    queue.release('write-1');
    await queue.resume();

    expect(sent).toHaveLength(2);
    expect(await outbox.listPending()).toEqual([]);
    expect(await outbox.listRejected()).toEqual([]);
  });

  it('sends a put-back write without the version the row had, so the person keeps their value', async () => {
    const stale: PageViewWrite = {
      expectedVersion: 4,
      kind: 'cell',
      pageId: 'row-1',
      propertyValues: { status: 'a' },
      spaceId: 'space-1',
    };
    const { outbox, queue, sent } = createFixture([{ cause: 'conflict', kind: 'rejected', message: 'conflict' }]);
    await queue.enqueue(stale, 'a');

    await outbox.retryRejected('write-1');
    queue.release('write-1');
    await queue.resume();

    expect(sent[0]).toEqual(stale);
    expect(sent[1]).toEqual(cell('row-1', 'a'));
  });

  it('answers a refusal, and tells who is waiting, when the disk will not keep the write', async () => {
    const bundle = createMemoryStorage<CacheableBody>();
    const failing = createOutbox({
      now: () => 5000,
      storage: {
        ...bundle.outbox,
        appendTransaction: () => Promise.reject(new Error('quota')),
      },
    });
    const answered: string[] = [];
    const failures: unknown[] = [];
    const queue = createViewWriteQueue({
      collectionId: 'collection-1',
      newId: () => 'write-1',
      onAnswered: (id) => answered.push(id),
      onStorageFailure: (error) => failures.push(error),
      outbox: failing,
      ownerId: 'tab-1',
      scheduleRetry: () => () => undefined,
      send: async () => ({ kind: 'applied' }),
    });

    const settled = await queue.enqueue(cell('row-1', 'a'), 'a');

    expect(settled).toMatchObject({ kind: 'rejected' });
    expect(answered).toEqual(['write-1']);
    expect(failures).toHaveLength(1);
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
