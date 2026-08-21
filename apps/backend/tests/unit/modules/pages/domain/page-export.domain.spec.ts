import { describe, expect, it } from 'bun:test';
import { orderPagesForExport, selectPagesForExport } from '@/modules/pages/domain/page-export.domain';

const pages = [
  { id: 'root-a', order: 0, parentId: null, title: 'Madre' },
  { id: 'child-a', order: 0, parentId: 'root-a', title: 'Hija mayor' },
  { id: 'child-b', order: 1, parentId: 'root-a', title: 'Hija menor' },
  { id: 'grandchild', order: 0, parentId: 'child-a', title: 'Nieta' },
  { id: 'root-b', order: 1, parentId: null, title: 'Otra madre' },
];

describe('selectPagesForExport', () => {
  it('takes one page alone when that is all that was asked for', () => {
    expect(selectPagesForExport(pages, { kind: 'page', pageId: 'child-a' }).map((page) => page.id)).toEqual([
      'child-a',
    ]);
  });

  it('takes a page with everything hanging from it, however deep', () => {
    const chosen = selectPagesForExport(pages, { kind: 'branch', pageId: 'root-a' }).map((page) => page.id);

    expect(chosen).toEqual(['root-a', 'child-a', 'grandchild', 'child-b']);
  });

  it('takes the whole space when the space is what was asked for', () => {
    expect(selectPagesForExport(pages, { kind: 'space' }).map((page) => page.id)).toEqual([
      'root-a',
      'child-a',
      'grandchild',
      'child-b',
      'root-b',
    ]);
  });

  it('has nothing to give for a page that is not there', () => {
    expect(selectPagesForExport(pages, { kind: 'branch', pageId: 'nowhere' })).toEqual([]);
  });
});

describe('orderPagesForExport', () => {
  it('reads a mother before her daughters, the way the tree reads on screen', () => {
    expect(orderPagesForExport(pages).map((page) => page.id)).toEqual([
      'root-a',
      'child-a',
      'grandchild',
      'child-b',
      'root-b',
    ]);
  });

  it('carries the names above each page, so where it lived comes out with it', () => {
    const ordered = orderPagesForExport(pages);

    expect(ordered.find((page) => page.id === 'grandchild')?.path).toEqual(['Madre', 'Hija mayor']);
    expect(ordered.find((page) => page.id === 'root-a')?.path).toEqual([]);
  });
});
