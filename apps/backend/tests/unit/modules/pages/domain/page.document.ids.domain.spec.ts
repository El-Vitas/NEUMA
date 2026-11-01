import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { listDocumentBlockIds, rewriteDocumentIds } from '@/modules/pages/domain/page.document.ids.domain';

const paragraph = (id: string, text: string) => ({
  attrs: { id },
  content: [{ text, type: 'text' as const }],
  type: 'paragraph' as const,
});

const branchDocument: PageContent = {
  content: [
    paragraph('block-a', 'Uno'),
    {
      attrs: { id: 'block-link', label: 'Hija', pageId: 'child-page', spaceId: 'space-1' },
      type: 'subpage',
    },
    {
      attrs: { blockId: 'block-a', id: 'block-synced', pageId: 'page-1', spaceId: 'space-1' },
      type: 'synced',
    },
    {
      attrs: { blockId: 'elsewhere-block', id: 'block-far', pageId: 'elsewhere-page', spaceId: 'space-1' },
      type: 'synced',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
};

const maps = {
  blocks: new Map([
    ['block-a', 'copy-a'],
    ['block-link', 'copy-link'],
    ['block-synced', 'copy-synced'],
    ['block-far', 'copy-far'],
  ]),
  pages: new Map([
    ['page-1', 'copy-page'],
    ['child-page', 'copy-child'],
  ]),
};

describe('the ids of a document', () => {
  it('lists the id of every block in reading order', () => {
    expect(listDocumentBlockIds(branchDocument)).toEqual(['block-a', 'block-link', 'block-synced', 'block-far']);
  });
});

describe('copying a branch', () => {
  const rewritten = rewriteDocumentIds(branchDocument, maps).getValue();
  const attributesOf = (index: number): Record<string, unknown> => {
    const node: unknown = rewritten.content[index];
    return typeof node === 'object' && node !== null && 'attrs' in node ? (node.attrs as Record<string, unknown>) : {};
  };

  it('gives every block of the copy its own id', () => {
    expect(listDocumentBlockIds(rewritten)).toEqual(['copy-a', 'copy-link', 'copy-synced', 'copy-far']);
  });

  it('points a subpage at the copy of the page it showed', () => {
    expect(attributesOf(1)).toMatchObject({ id: 'copy-link', pageId: 'copy-child' });
  });

  it('points a synced block at the copy of its source when the source is part of the branch', () => {
    expect(attributesOf(2)).toMatchObject({ blockId: 'copy-a', id: 'copy-synced', pageId: 'copy-page' });
  });

  it('keeps pointing outside the branch where it pointed', () => {
    expect(attributesOf(3)).toMatchObject({ blockId: 'elsewhere-block', id: 'copy-far', pageId: 'elsewhere-page' });
  });

  it('leaves the original document as it was', () => {
    expect(listDocumentBlockIds(branchDocument)).toEqual(['block-a', 'block-link', 'block-synced', 'block-far']);
  });
});
