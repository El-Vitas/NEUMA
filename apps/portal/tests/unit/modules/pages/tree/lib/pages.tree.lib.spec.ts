import { describe, expect, it } from 'bun:test';
import {
  appendPageTreeEntry,
  buildPageTreeRootsSignature,
  createEmptyPageTreeSpace,
  listPageTreeReloadWindows,
  listPageTreeWatermarks,
  mergePageTreeWindow,
  readPageTreeBranchBounds,
  selectPageTreeEntries,
} from '@/modules/pages/tree/lib/pages.tree.lib';
import type { PageTreeEntry } from '@/modules/pages/tree/types/pages.tree.types';

const entry = (id: string, parentId: string | null, hasChildren = false): PageTreeEntry => ({
  canEdit: true,
  hasChildren,
  hasOwnPermissions: false,
  icon: null,
  id,
  isCollection: false,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId,
  title: id,
  version: 1,
});

const entries = (prefix: string, count: number, parentId: string | null, from = 0): PageTreeEntry[] =>
  Array.from({ length: count }, (_, index) => entry(`${prefix}${String(from + index)}`, parentId));

describe('mergePageTreeWindow', () => {
  it('stores the first window of the top of the space', () => {
    const space = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: entries('r', 3, null),
      total: 3,
    });

    expect(readPageTreeBranchBounds(space, null)).toEqual({ hasNext: false, hasPrevious: false });
    expect(selectPageTreeEntries(space).map((page) => page.id)).toEqual(['r0', 'r1', 'r2']);
  });

  it('appends the next window to the ones loaded', () => {
    const first = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: entries('r', 2, null),
      total: 4,
    });

    const both = mergePageTreeWindow(first, null, 2, { entries: entries('r', 2, null, 2), total: 4 });

    expect(selectPageTreeEntries(both).map((page) => page.id)).toEqual(['r0', 'r1', 'r2', 'r3']);
    expect(readPageTreeBranchBounds(both, null)).toEqual({ hasNext: false, hasPrevious: false });
  });

  it('says there is more when the loaded stretch does not reach the end', () => {
    const space = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: entries('r', 2, null),
      total: 5,
    });

    expect(readPageTreeBranchBounds(space, null)).toEqual({ hasNext: true, hasPrevious: false });
  });

  it('keeps a window that starts past the first and says there are pages before it', () => {
    const space = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 100, {
      entries: entries('r', 5, null, 100),
      total: 105,
    });

    expect(readPageTreeBranchBounds(space, null)).toEqual({ hasNext: false, hasPrevious: true });
    expect(selectPageTreeEntries(space).map((page) => page.order)).toEqual([100, 101, 102, 103, 104]);
  });

  it('prepends the window before the one loaded', () => {
    const late = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 2, {
      entries: entries('r', 2, null, 2),
      total: 4,
    });

    const all = mergePageTreeWindow(late, null, 0, { entries: entries('r', 2, null), total: 4 });

    expect(selectPageTreeEntries(all).map((page) => page.id)).toEqual(['r0', 'r1', 'r2', 'r3']);
  });

  it('replaces a window that no longer touches the ones loaded', () => {
    const first = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: entries('r', 2, null),
      total: 500,
    });

    const far = mergePageTreeWindow(first, null, 300, { entries: entries('r', 2, null, 300), total: 500 });

    expect(selectPageTreeEntries(far).map((page) => page.id)).toEqual(['r300', 'r301']);
  });

  it('drops the pages a reload no longer lists and trims what is past the new total', () => {
    const full = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, { entries: entries('r', 4, null), total: 4 });

    const smaller = mergePageTreeWindow(full, null, 0, { entries: [entry('r0', null), entry('r2', null)], total: 2 });

    expect(selectPageTreeEntries(smaller).map((page) => page.id)).toEqual(['r0', 'r2']);
  });

  it('nests the children of a page under it', () => {
    const roots = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: [entry('a', null, true), entry('b', null)],
      total: 2,
    });

    const nested = mergePageTreeWindow(roots, 'a', 0, { entries: [entry('a1', 'a')], total: 1 });

    expect(selectPageTreeEntries(nested).map((page) => [page.id, page.parentId])).toEqual([
      ['a', null],
      ['b', null],
      ['a1', 'a'],
    ]);
  });
});

describe('selectPageTreeEntries', () => {
  it('leaves out the children of a page that left the list', () => {
    const roots = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: [entry('a', null, true), entry('b', null)],
      total: 2,
    });
    const nested = mergePageTreeWindow(roots, 'a', 0, { entries: [entry('a1', 'a')], total: 1 });

    const withoutA = mergePageTreeWindow(nested, null, 0, { entries: [entry('b', null)], total: 1 });

    expect(selectPageTreeEntries(withoutA).map((page) => page.id)).toEqual(['b']);
  });
});

describe('listPageTreeReloadWindows', () => {
  it('asks again for the stretch of every open branch, and not for the ones that are gone', () => {
    const roots = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: [entry('a', null, true), entry('b', null, true)],
      total: 2,
    });
    const nested = mergePageTreeWindow(roots, 'a', 0, { entries: [entry('a1', 'a')], total: 1 });
    const orphaned = mergePageTreeWindow(nested, 'b', 0, { entries: [entry('b1', 'b')], total: 1 });
    const withoutB = mergePageTreeWindow(orphaned, null, 0, { entries: [entry('a', null, true)], total: 1 });

    expect(listPageTreeReloadWindows(withoutB)).toEqual([
      { parentId: null, skip: 0, take: 100 },
      { parentId: 'a', skip: 0, take: 100 },
    ]);
  });

  it('splits a stretch longer than the backend allows in one request, with room for a page that arrived', () => {
    const space = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: entries('r', 450, null),
      total: 450,
    });

    expect(listPageTreeReloadWindows(space)).toEqual([
      { parentId: null, skip: 0, take: 200 },
      { parentId: null, skip: 200, take: 200 },
      { parentId: null, skip: 400, take: 100 },
    ]);
  });

  it('starts at the first page it has loaded when the stretch begins past the first', () => {
    const space = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 300, {
      entries: entries('r', 50, null, 300),
      total: 350,
    });

    expect(listPageTreeReloadWindows(space)).toEqual([{ parentId: null, skip: 300, take: 100 }]);
  });

  it('asks for at least one page of an open branch that came back empty', () => {
    const roots = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: [entry('a', null, true)],
      total: 1,
    });
    const empty = mergePageTreeWindow(roots, 'a', 0, { entries: [], total: 0 });

    expect(listPageTreeReloadWindows(empty)).toContainEqual({ parentId: 'a', skip: 0, take: 100 });
  });
});

describe('buildPageTreeRootsSignature', () => {
  const roots = (id: string, version: number, total = 1) => ({
    id: 'space-1',
    roots: { entries: [{ ...entry(id, null), version }], total },
  });

  it('is the same for the same pages drawn again', () => {
    expect(buildPageTreeRootsSignature([roots('a', 3)])).toBe(buildPageTreeRootsSignature([roots('a', 3)]));
  });

  it('changes when a page at the top changed, was added or was removed', () => {
    const before = buildPageTreeRootsSignature([roots('a', 3)]);

    expect(buildPageTreeRootsSignature([roots('a', 4)])).not.toBe(before);
    expect(buildPageTreeRootsSignature([roots('b', 3)])).not.toBe(before);
    expect(buildPageTreeRootsSignature([roots('a', 3, 2)])).not.toBe(before);
  });
});

describe('appendPageTreeEntry', () => {
  it('puts the open page of the trash at the end of the list of its parent, where the sidebar can show it', () => {
    const roots = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: [entry('a', null, true)],
      total: 1,
    });
    const nested = mergePageTreeWindow(roots, 'a', 0, { entries: [entry('a1', 'a')], total: 1 });
    const trashed: PageTreeEntry = { ...entry('a2', 'a'), lifecycle: 'TRASHED' };

    const withOpen = appendPageTreeEntry(nested, trashed);

    expect(selectPageTreeEntries(withOpen).map((page) => [page.id, page.lifecycle])).toEqual([
      ['a', 'ACTIVE'],
      ['a1', 'ACTIVE'],
      ['a2', 'TRASHED'],
    ]);
  });

  it('does nothing when the list of its parent is not loaded', () => {
    const roots = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, {
      entries: [entry('a', null, true)],
      total: 1,
    });

    expect(appendPageTreeEntry(roots, { ...entry('a2', 'a'), lifecycle: 'TRASHED' })).toBe(roots);
  });

  it('does not repeat a page the list already holds', () => {
    const roots = mergePageTreeWindow(createEmptyPageTreeSpace(), null, 0, { entries: [entry('a', null)], total: 1 });

    expect(selectPageTreeEntries(appendPageTreeEntry(roots, entry('a', null))).map((page) => page.id)).toEqual(['a']);
  });
});

describe('listPageTreeWatermarks', () => {
  it('keeps the point each space was read at, and leaves out the ones that carry none', () => {
    const spaces = [
      { id: 's1', roots: { entries: [], total: 0, watermark: '120' } },
      { id: 's2', roots: { entries: [], total: 0 } },
    ];

    expect(listPageTreeWatermarks(spaces)).toEqual({ s1: '120' });
  });
});
