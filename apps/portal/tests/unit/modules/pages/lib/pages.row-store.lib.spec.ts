import { describe, expect, it } from 'bun:test';
import { createPageRowStore } from '@/modules/pages/collections/lib/pages.row-store.lib';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';

const rowOf = (id: string, title = id, propertyValues: PageRow['propertyValues'] = null): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues,
  spaceId: 'space-1',
  title,
});

describe('createPageRowStore', () => {
  it('keeps new rows after the ones it holds and replaces a known row where it stands', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a'), rowOf('b')]);

    store.upsertRows([rowOf('c'), rowOf('a', 'renamed')]);

    expect(store.listRows().map((row) => [row.id, row.title])).toEqual([
      ['a', 'renamed'],
      ['b', 'b'],
      ['c', 'c'],
    ]);
  });

  it('tells only the readers of a row that the row changed', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a'), rowOf('b')]);
    const heard: string[] = [];
    store.subscribeRow('a', () => heard.push('a'));
    store.subscribeRow('b', () => heard.push('b'));

    store.upsertRows([rowOf('a', 'renamed')]);

    expect(heard).toEqual(['a']);
  });

  it('says nothing when the same row arrives again', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a', 'a', { points: 1 })]);
    let announcements = 0;
    store.subscribe(() => {
      announcements += 1;
    });
    const before = store.getVersion();

    store.upsertRows([rowOf('a', 'a', { points: 1 })]);

    expect(announcements).toBe(0);
    expect(store.getVersion()).toBe(before);
  });

  it('forgets removed rows and tells their readers', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a'), rowOf('b')]);
    const heard: string[] = [];
    store.subscribeRow('a', () => heard.push('a'));

    store.removeRows(['a', 'missing']);

    expect(store.getRow('a')).toBeUndefined();
    expect(store.listRows().map((row) => row.id)).toEqual(['b']);
    expect(heard).toEqual(['a']);
  });

  it('takes a whole list as the truth: its order, and no row it does not name', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a'), rowOf('b'), rowOf('c')]);
    const heard: string[] = [];
    store.subscribeRow('b', () => heard.push('b'));
    store.subscribeRow('c', () => heard.push('c'));

    store.replaceAll([rowOf('c'), rowOf('a'), rowOf('d')]);

    expect(store.listRows().map((row) => row.id)).toEqual(['c', 'a', 'd']);
    expect(heard).toEqual(['b']);
  });

  it('puts a row before or after another in the order it keeps', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a'), rowOf('b'), rowOf('c')]);

    store.moveRow('c', { before: 'a' });
    expect(store.listRows().map((row) => row.id)).toEqual(['c', 'a', 'b']);

    store.moveRow('c', { after: 'b' });
    expect(store.listRows().map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the order when the row to put it beside is not held', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a'), rowOf('b')]);

    store.moveRow('a', { after: 'missing' });

    expect(store.listRows().map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('stops telling a reader that unsubscribed', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a')]);
    let announcements = 0;
    const stop = store.subscribe(() => {
      announcements += 1;
    });
    stop();

    store.upsertRows([rowOf('a', 'renamed')]);

    expect(announcements).toBe(0);
  });

  it('hands out the same list until something changes, so a reader can compare it', () => {
    const store = createPageRowStore();
    store.upsertRows([rowOf('a')]);
    const first = store.listRows();

    expect(store.listRows()).toBe(first);

    store.upsertRows([rowOf('b')]);

    expect(store.listRows()).not.toBe(first);
  });
});
