import { describe, expect, it } from 'bun:test';
import { InMemoryBlockPresenceStore } from '@/modules/blocks/infrastructure/presence/block.presence.store';

const TIME_TO_LIVE_MS = 1000;
const START = 50_000;

const buildStore = (): InMemoryBlockPresenceStore => new InMemoryBlockPresenceStore(TIME_TO_LIVE_MS);

describe('InMemoryBlockPresenceStore', () => {
  it('keeps an entry until its time to live passes', () => {
    const store = buildStore();
    store.set({ blockId: 'block-1', connectionId: 'connection-1', pageId: 'page-1', userId: 'user-1' }, START);

    expect(store.list('page-1', START + TIME_TO_LIVE_MS - 1)).toEqual([
      { blockId: 'block-1', connectionId: 'connection-1', expiresAt: START + TIME_TO_LIVE_MS, userId: 'user-1' },
    ]);
    expect(store.list('page-1', START + TIME_TO_LIVE_MS)).toEqual([]);
  });

  it('refreshes the time to live when the same connection sends presence again', () => {
    const store = buildStore();
    const entry = { blockId: 'block-1', connectionId: 'connection-1', pageId: 'page-1', userId: 'user-1' };
    store.set(entry, START);

    store.set(entry, START + 800);

    expect(store.list('page-1', START + 1500).map((listed) => listed.expiresAt)).toEqual([
      START + 800 + TIME_TO_LIVE_MS,
    ]);
  });

  it('keeps one entry per connection and replaces its block', () => {
    const store = buildStore();
    store.set({ blockId: 'block-1', connectionId: 'connection-1', pageId: 'page-1', userId: 'user-1' }, START);
    store.set({ blockId: null, connectionId: 'connection-1', pageId: 'page-1', userId: 'user-1' }, START);

    expect(store.list('page-1', START).map((listed) => listed.blockId)).toEqual([null]);
  });

  it('lists only the entries of the page asked for', () => {
    const store = buildStore();
    store.set({ blockId: null, connectionId: 'connection-1', pageId: 'page-1', userId: 'user-1' }, START);
    store.set({ blockId: null, connectionId: 'connection-2', pageId: 'page-2', userId: 'user-2' }, START);

    expect(store.list('page-2', START).map((listed) => listed.userId)).toEqual(['user-2']);
  });

  it('removes the entry of a connection on one page and says whether there was one', () => {
    const store = buildStore();
    store.set({ blockId: null, connectionId: 'connection-1', pageId: 'page-1', userId: 'user-1' }, START);

    expect(store.remove('page-1', 'connection-1')).toBe(true);
    expect(store.remove('page-1', 'connection-1')).toBe(false);
    expect(store.list('page-1', START)).toEqual([]);
  });

  it('removes every entry of a closed connection and names the pages that changed', () => {
    const store = buildStore();
    store.set({ blockId: null, connectionId: 'connection-1', pageId: 'page-1', userId: 'user-1' }, START);
    store.set({ blockId: null, connectionId: 'connection-1', pageId: 'page-2', userId: 'user-1' }, START);
    store.set({ blockId: null, connectionId: 'connection-2', pageId: 'page-1', userId: 'user-2' }, START);

    const changedPageIds = store.removeConnection('connection-1');

    expect(changedPageIds.toSorted()).toEqual(['page-1', 'page-2']);
    expect(store.list('page-1', START).map((listed) => listed.userId)).toEqual(['user-2']);
    expect(store.list('page-2', START)).toEqual([]);
  });

  it('drops expired entries and names the pages that lost someone', () => {
    const store = buildStore();
    store.set({ blockId: null, connectionId: 'connection-1', pageId: 'page-1', userId: 'user-1' }, START);
    store.set({ blockId: null, connectionId: 'connection-2', pageId: 'page-2', userId: 'user-2' }, START + 600);

    expect(store.expire(START + 500)).toEqual([]);
    expect(store.expire(START + TIME_TO_LIVE_MS)).toEqual(['page-1']);
    expect(store.list('page-2', START + TIME_TO_LIVE_MS).map((listed) => listed.userId)).toEqual(['user-2']);
    expect(store.expire(START + 600 + TIME_TO_LIVE_MS)).toEqual(['page-2']);
  });
});
