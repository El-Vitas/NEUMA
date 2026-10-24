import { describe, expect, it } from 'bun:test';
import {
  keepReferencedAssets,
  orderPagesForExport,
  readExportScope,
  selectPagesForExport,
} from '@/modules/pages/domain/page-export.domain';

describe('keepReferencedAssets', () => {
  const assets = [
    { id: 'seen-image', originalFilename: 'a.png', size: 1, storageKey: 'k1' },
    { id: 'seen-nested', originalFilename: 'b.pdf', size: 1, storageKey: 'k2' },
    { id: 'hidden-upload', originalFilename: 'c.png', size: 1, storageKey: 'k3' },
  ];

  it('keeps only the files the exported documents name, however deep, and drops the ones of hidden blocks', () => {
    const documents = [
      {
        content: [
          { attrs: { assetId: 'seen-image' }, type: 'image' },
          {
            content: [{ content: [{ attrs: { assetId: 'seen-nested' }, type: 'file' }], type: 'toggle' }],
            type: 'column',
          },
        ],
        type: 'doc',
      },
    ];

    const kept = keepReferencedAssets(assets, documents);

    expect(kept.map((asset) => asset.id)).toEqual(['seen-image', 'seen-nested']);
  });

  it('keeps nothing when no document names a file', () => {
    expect(keepReferencedAssets(assets, [{ content: [], type: 'doc' }])).toEqual([]);
  });
});

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

  it('takes only the pages somebody picked, in the order the tree reads', () => {
    const chosen = selectPagesForExport(pages, { kind: 'pages', pageIds: ['root-b', 'child-a'] });

    expect(chosen.map((page) => page.id)).toEqual(['child-a', 'root-b']);
  });

  it('leaves out what hangs from a picked page, because it was not picked', () => {
    const chosen = selectPagesForExport(pages, { kind: 'pages', pageIds: ['root-a'] });

    expect(chosen.map((page) => page.id)).toEqual(['root-a']);
  });

  it('ignores a picked page that is not there instead of failing on it', () => {
    const chosen = selectPagesForExport(pages, { kind: 'pages', pageIds: ['nowhere', 'child-b'] });

    expect(chosen.map((page) => page.id)).toEqual(['child-b']);
  });
});

describe('readExportScope', () => {
  it('refuses a selection that names no pages', () => {
    expect(readExportScope('pages', null, [])).toBeNull();
  });

  it('reads a selection from the pages it names, ignoring the single page', () => {
    expect(readExportScope('pages', null, ['one', 'other'])).toEqual({ kind: 'pages', pageIds: ['one', 'other'] });
  });

  it('refuses one page that does not say which', () => {
    expect(readExportScope('branch', null, [])).toBeNull();
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
