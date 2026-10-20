import { describe, expect, it } from 'bun:test';
import type { BlockRichText } from '@neuma/shared';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';
import { decodeBase64, encodeBase64 } from '@/modules/pages/block-sync/lib/block-sync.base64.lib';
import { buildApplyTextOperation } from '@/modules/pages/block-sync/lib/block-sync.operations.lib';
import { createBlockStore } from '@/modules/pages/block-sync/lib/block-sync.store.lib';
import {
  documentOf,
  PAGE_ID,
  paragraph,
  readSnapshot,
  snapshotsOf,
  syncedBlocksOf,
  text,
} from '../block-sync.fixtures';

const plain = (value: string): BlockRichText => [{ insert: value }];

const titleOf = (store: ReturnType<typeof createBlockStore>, id: string): unknown =>
  readSnapshot(store.readSnapshots(), id).properties.title;

describe('createBlockStore', () => {
  it('starts from the blocks the server sent', () => {
    const content = documentOf(paragraph('p1', text('Hello')), paragraph('p2', text('World')));

    const store = createBlockStore(syncedBlocksOf(content));

    expect(store.readSnapshots()).toEqual(snapshotsOf(content));
    expect(store.readVersion('p1')).toBe(1);
  });

  it('reads the text from the local Yjs documents, so unsent edits are part of it', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('Hello')))));

    store.textWriter.write('p1', 'title', plain('Hello!'));

    expect(titleOf(store, 'p1')).toEqual(plain('Hello!'));
  });

  it('merges a text the server changed without losing the local edit', () => {
    const server = documentOf(paragraph('p1', text('Hello world')));
    const blocks = syncedBlocksOf(server);
    const store = createBlockStore(blocks);
    store.textWriter.write('p1', 'title', plain('Hello brave world'));

    const remoteDoc = new Doc();
    const original = blocks.find((block) => block.id === 'p1');
    if (original === undefined) throw new Error('No p1');
    applyUpdate(remoteDoc, decodeBase64(original.textState ?? ''));
    const remoteText = remoteDoc.getText('title');
    remoteText.insert(remoteText.length, '!');
    store.mergeBlocks({
      blocks: [{ ...original, textState: encodeBase64(encodeStateAsUpdate(remoteDoc)), version: 2 }],
    });

    expect(titleOf(store, 'p1')).toEqual(plain('Hello brave world!'));
    expect(store.readVersion('p1')).toBe(2);
  });

  it('reports the blocks that changed in a merge, not the ones that are as before', () => {
    const content = documentOf(paragraph('p1', text('a')), paragraph('p2', text('b')));
    const blocks = syncedBlocksOf(content);
    const store = createBlockStore(blocks);

    const changed = store.mergeBlocks({
      blocks: blocks.map((block) => (block.id === 'p2' ? { ...block, version: 3 } : block)),
    });

    expect(changed).toEqual(['p2']);
  });

  it('drops the blocks that were revoked', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('a')), paragraph('p2', text('b')))));

    store.mergeBlocks({ blocks: [], revoked: ['p2'] });

    expect(store.readSnapshots().has('p2')).toBe(false);
  });

  it('replaces the whole page on a page sync', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('a')), paragraph('p2', text('b')))));

    store.replacePage(syncedBlocksOf(documentOf(paragraph('p1', text('a'))), 2));

    expect(store.readSnapshots().has('p2')).toBe(false);
    expect(store.readVersion('p1')).toBe(2);
  });

  it('names the versions it is behind on, and the blocks it has never seen', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('a')))));

    expect(
      store.findBehind([
        { id: 'p1', version: 1 },
        { id: 'p1x', version: 4 },
        { id: PAGE_ID, version: 9 },
      ]),
    ).toEqual([
      { id: 'p1x', version: 0 },
      { id: PAGE_ID, version: 1 },
    ]);
  });
});

describe('confirmTransaction', () => {
  it('takes the version as known when only this client touched the block', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('a')))));

    const toSync = store.confirmTransaction([{ id: 'p1', version: 3 }], new Map([['p1', 2]]));

    expect(toSync).toEqual([]);
    expect(store.readVersion('p1')).toBe(3);
  });

  it('asks to read a block whose version moved more than this client moved it', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('a')))));

    const toSync = store.confirmTransaction([{ id: 'p1', version: 7 }], new Map([['p1', 2]]));

    expect(toSync).toEqual(['p1']);
    expect(store.readVersion('p1')).toBe(1);
  });

  it('starts a block this client created at the operations it sent', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('a')))));

    const toSync = store.confirmTransaction([{ id: 'n1', version: 3 }], new Map([['n1', 3]]));

    expect(toSync).toEqual([]);
    expect(store.readVersion('n1')).toBe(3);
  });
});

describe('text confirmation', () => {
  it('returns no update when the text is the same and everything was confirmed', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('Hello')))));

    expect(store.textWriter.write('p1', 'title', plain('Hello'))).toBeNull();
  });

  it('sends again what the server has not confirmed', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('Hello')))));
    const first = store.textWriter.write('p1', 'title', plain('Hello!'));

    const again = store.textWriter.write('p1', 'title', plain('Hello!'));

    expect(first).not.toBeNull();
    expect(again).not.toBeNull();
  });

  it('stops sending a text once the server confirmed it', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('Hello')))));
    store.textWriter.write('p1', 'title', plain('Hello!'));
    const receipts = store.createTextReceipts([buildApplyTextOperation('p1', 'title', 'AAAA')]);

    store.confirmTexts(receipts);

    expect(store.textWriter.write('p1', 'title', plain('Hello!'))).toBeNull();
    expect(store.listUnconfirmedTexts()).toEqual([]);
  });

  it('keeps a text unconfirmed when it was written again after the receipt was taken', () => {
    const store = createBlockStore(syncedBlocksOf(documentOf(paragraph('p1', text('Hello')))));
    store.textWriter.write('p1', 'title', plain('Hello!'));
    const receipts = store.createTextReceipts([buildApplyTextOperation('p1', 'title', 'AAAA')]);
    store.textWriter.write('p1', 'title', plain('Hello!!'));

    store.confirmTexts(receipts);

    expect(store.listUnconfirmedTexts()).toEqual([{ blockId: 'p1', property: 'title' }]);
  });

  it('refuses to write a text it holds no Yjs state for while the server has text', () => {
    const blocks = syncedBlocksOf(documentOf(paragraph('p1', text('Hello')))).map((block) =>
      block.id === 'p1' ? { ...block, textState: null } : block,
    );
    const store = createBlockStore(blocks);

    expect(store.textWriter.canWrite('p1', 'title')).toBe(false);
    expect(store.textWriter.canWrite('new-block', 'title')).toBe(true);
  });
});

describe('blocks known to be dead', () => {
  const content = documentOf(paragraph('p1', text('Hello')), paragraph('p2', text('World')));

  it('are remembered as they were when this client deleted them', () => {
    const store = createBlockStore(syncedBlocksOf(content));
    const removed = readSnapshot(store.readSnapshots(), 'p2');

    store.bury([removed]);

    expect(store.readBuried().get('p2')).toEqual(removed);
  });

  it('are remembered when the server says a block is dead', () => {
    const blocks = syncedBlocksOf(content);
    const store = createBlockStore(blocks);

    store.mergeBlocks({
      blocks: blocks.map((block) => (block.id === 'p2' ? { ...block, alive: false, version: 2 } : block)),
    });

    expect(store.readSnapshots().has('p2')).toBe(false);
    expect(store.readBuried().has('p2')).toBe(true);
    expect(store.readVersion('p2')).toBe(2);
  });

  it('are remembered when a page read lists them as dead', () => {
    const blocks = syncedBlocksOf(content);
    const store = createBlockStore(blocks);

    store.replacePage(blocks.map((block) => (block.id === 'p2' ? { ...block, alive: false, version: 2 } : block)));

    expect(store.readBuried().has('p2')).toBe(true);
  });

  it('are forgotten once the server holds them alive again', () => {
    const blocks = syncedBlocksOf(content);
    const store = createBlockStore(blocks);
    const removed = readSnapshot(store.readSnapshots(), 'p2');
    store.bury([removed]);

    store.adoptSnapshots(['p2'], new Map([['p2', removed]]));

    expect(store.readBuried().has('p2')).toBe(false);
    expect(store.isLive('p2')).toBe(true);
  });

  it('are not live, and a block never seen is not live either', () => {
    const store = createBlockStore(syncedBlocksOf(content));
    store.adoptSnapshots(['p2'], new Map());

    expect(store.isLive('p1')).toBe(true);
    expect(store.isLive('p2')).toBe(false);
    expect(store.isLive('never-seen')).toBe(false);
  });

  it('are dropped from memory when the server never had them', () => {
    const store = createBlockStore(syncedBlocksOf(content));
    const removed = readSnapshot(store.readSnapshots(), 'p2');
    store.bury([removed, { ...removed, id: 'made-here' }]);

    store.forgetUnconfirmedBurials();

    expect(store.readBuried().has('p2')).toBe(true);
    expect(store.readBuried().has('made-here')).toBe(false);
  });
});
