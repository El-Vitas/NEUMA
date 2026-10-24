import { describe, expect, it } from 'bun:test';
import { createPendingValuesStore } from '@/modules/pages/collections/lib/pages.view-writes.pending.lib';
import type { PageViewWrite } from '@/modules/pages/collections/types/pages.view-writes.types';

const cell = (pageId: string, value: null | string): PageViewWrite => ({
  kind: 'cell',
  pageId,
  propertyValues: { status: value },
  spaceId: 'space-1',
});

describe('createPendingValuesStore', () => {
  it('answers with the value of the last write not yet answered, null for a cleared cell and undefined for none', () => {
    const store = createPendingValuesStore();
    store.add(cell('row-1', 'doing'));
    store.add(cell('row-1', 'done'));
    store.add(cell('row-2', null));

    expect(store.read('row-1', 'status')).toBe('done');
    expect(store.read('row-2', 'status')).toBeNull();
    expect(store.read('row-3', 'status')).toBeUndefined();
  });

  it('forgets a write once it is answered', () => {
    const store = createPendingValuesStore();
    const first = cell('row-1', 'doing');
    store.add(first);
    store.add(cell('row-1', 'done'));

    store.remove(first);

    expect(store.read('row-1', 'status')).toBe('done');
  });

  it('tells only the listeners of the row that changed', () => {
    const store = createPendingValuesStore();
    const heard: string[] = [];
    store.subscribeRow('row-1', () => heard.push('row-1'));
    store.subscribeRow('row-2', () => heard.push('row-2'));

    store.add(cell('row-1', 'done'));

    expect(heard).toEqual(['row-1']);
  });

  it('stops telling a listener that unsubscribed', () => {
    const store = createPendingValuesStore();
    const heard: string[] = [];
    const stop = store.subscribeRow('row-1', () => heard.push('row-1'));
    stop();

    store.add(cell('row-1', 'done'));

    expect(heard).toEqual([]);
  });
});
