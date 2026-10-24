import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { createBlockSyncOutbox } from '@/modules/pages/block-sync/lib/block-sync.outbox.lib';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { createOutbox } from '@/modules/pages/local-cache/lib/local-cache.outbox.lib';
import type { CacheableBody } from '@/modules/pages/local-cache/types/local-cache.types';
import { createClient, flush, serverContent, settle } from '../block-sync.engine-harness';
import { FakeBlockServer } from '../block-sync.fake-server';
import { documentOf, paragraph, text } from '../block-sync.fixtures';

const original = documentOf(paragraph('p1', text('Hello')), paragraph('p2', text('World')));
const edited = documentOf(paragraph('p1', text('Hello, offline')), paragraph('p2', text('World')));

const createDisk = () => {
  const bundle = createMemoryStorage<CacheableBody>();
  const outbox = createOutbox({ now: () => 1, storage: bundle.outbox });
  const open = (ownerId: string) =>
    createBlockSyncOutbox({ outbox, ownerId, pageId: 'page-1', report: () => undefined });
  return { open, outbox };
};

describe('createBlockSyncEngine with a persistent outbox', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('keeps what is written while the network is down, and sends it when the tab is opened again', async () => {
    const server = new FakeBlockServer(original);
    const disk = createDisk();
    const firstVisit = createClient(server, original, 'user-1', false, disk.open('tab-1'));
    firstVisit.edit(edited);
    await settle();

    expect(await disk.outbox.listPending()).toHaveLength(1);
    expect(server.readText('p1', 'title')).toBe('Hello');
    firstVisit.engine.destroy();

    const secondVisit = createClient(server, original, 'user-1', false, disk.open('tab-2'));
    secondVisit.session.connect();
    await flush();
    await settle();

    expect(server.readText('p1', 'title')).toBe('Hello, offline');
    expect(await disk.outbox.listPending()).toEqual([]);
  });

  it('keeps on disk what was typed in the instant before the page was left', async () => {
    const server = new FakeBlockServer(original);
    const disk = createDisk();
    const client = createClient(server, original, 'user-1', false, disk.open('tab-1'));

    client.edit(edited);
    client.engine.destroy();
    await flush();

    expect(await disk.outbox.listPending()).toHaveLength(1);
  });

  it('leaves nothing on disk once the server answered what was written online', async () => {
    const server = new FakeBlockServer(original);
    const disk = createDisk();
    const client = createClient(server, original, 'user-1', false, disk.open('tab-1'));
    client.session.connect();
    await flush();

    client.edit(edited);
    await settle();

    expect(serverContent(server)).toEqual(edited);
    expect(await disk.outbox.listPending()).toEqual([]);
  });

  it('keeps a transaction the server refused, apart, with its reason', async () => {
    const server = new FakeBlockServer(original);
    const disk = createDisk();
    const client = createClient(server, original, 'user-1', false, disk.open('tab-1'));
    client.session.connect();
    await flush();

    server.failNextTransaction('FORBIDDEN');
    client.edit(edited);
    await settle();

    expect(await disk.outbox.listPending()).toEqual([]);
    expect((await disk.outbox.listRejected()).map((aside) => aside.cause)).toHaveLength(1);
    expect((await disk.outbox.listRejected())[0]?.previews).toEqual([
      { blockId: 'p1', property: 'title', text: 'Hello, offline' },
    ]);
  });
});
