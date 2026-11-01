import { describe, expect, it } from 'bun:test';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import {
  extractReferencedPageIds,
  extractSyncedPageIds,
  listRelatedPageIds,
  mergePageReferences,
  toBreadcrumbParents,
} from '@/modules/pages/tree/lib/pages.references.lib';
import type { PageContent, PageReference } from '@/modules/pages/types/pages.types';
import { defaultConfig } from '../../lib/pages.options.fixture';

const asContent = (content: unknown[]): PageContent => ({ content, schemaVersion: 1, type: 'doc' }) as PageContent;

const content = asContent([
  {
    content: [
      { text: 'Hola ', type: 'text' },
      { attrs: { label: 'Una', pageId: 'mentioned', spaceId: 's' }, type: 'mention' },
    ],
    type: 'paragraph',
  },
  { attrs: { id: 'b1', label: 'Hija', pageId: 'child', spaceId: 's' }, type: 'subpage' },
  { attrs: { blockId: 'blk', id: 'b2', pageId: 'source', spaceId: 's' }, type: 'synced' },
  { attrs: { id: 'b3', pageId: 'tasks', spaceId: 's', viewName: 'Tabla' }, type: 'collection' },
  {
    content: [
      {
        content: [{ attrs: { label: 'Crear', pageId: 'target', spaceId: 's' }, type: 'button' }],
        type: 'paragraph',
      },
    ],
    type: 'blockquote',
  },
  { attrs: { id: 'b4', label: 'Sin página' }, type: 'button' },
]);

describe('extractReferencedPageIds', () => {
  it('finds every page a document mentions, nests, borrows from, embeds or points a button at', () => {
    expect(extractReferencedPageIds(content).toSorted()).toEqual(['child', 'mentioned', 'source', 'target', 'tasks']);
  });

  it('names a page once however many times it appears', () => {
    const twice = asContent([
      { attrs: { label: 'A', pageId: 'same', spaceId: 's' }, type: 'mention' },
      { attrs: { label: 'A', pageId: 'same', spaceId: 's' }, type: 'mention' },
    ]);

    expect(extractReferencedPageIds(twice)).toEqual(['same']);
  });

  it('finds nothing in a document with no references', () => {
    expect(extractReferencedPageIds(asContent([{ content: [], type: 'paragraph' }]))).toEqual([]);
  });
});

describe('extractSyncedPageIds', () => {
  it('finds only the pages whose blocks the document borrows', () => {
    expect(extractSyncedPageIds(content)).toEqual(['source']);
  });
});

const column = (key: string, type: PageSchemaProperty['type']): PageSchemaProperty => ({
  config: defaultConfig,
  key,
  label: key,
  options: null,
  required: false,
  type,
});

describe('listRelatedPageIds', () => {
  it('lists the rows the relation cells point to, once each, and ignores the other columns', () => {
    const ids = listRelatedPageIds([column('parts', 'RELATION'), column('status', 'SELECT')], {
      parts: ['row-1', 'row-2', 'row-1'],
      status: 'done',
    });

    expect(ids).toEqual(['row-1', 'row-2']);
  });

  it('lists nothing for a row with no values', () => {
    expect(listRelatedPageIds([column('parts', 'RELATION')], null)).toEqual([]);
  });
});

describe('toBreadcrumbParents', () => {
  it('names the ancestors the reader can open and leaves out the others', () => {
    const parents = toBreadcrumbParents([
      { icon: null, id: 'a', isReadable: true, lifecycle: 'ACTIVE', title: 'A' },
      { icon: null, id: null, isReadable: false, lifecycle: null, title: null },
      { icon: null, id: 'c', isReadable: true, lifecycle: 'ACTIVE', title: 'C' },
    ]);

    expect(parents).toEqual([
      { id: 'a', title: 'A' },
      { id: 'c', title: 'C' },
    ]);
  });
});

describe('mergePageReferences', () => {
  const reference = (id: string, title: string): PageReference => ({ id, lifecycle: 'ACTIVE', spaceId: 's', title });

  it('keeps the pages the page names first, and adds the others without repeating', () => {
    const merged = mergePageReferences(
      [reference('a', 'Named A')],
      [reference('a', 'Stale A'), reference('b', 'Other B')],
    );

    expect(merged.map((page) => [page.id, page.title])).toEqual([
      ['a', 'Named A'],
      ['b', 'Other B'],
    ]);
  });
});
