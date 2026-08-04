import { describe, expect, it } from 'bun:test';
import { PAGE_API_ROUTES } from '@/modules/pages/constants/pages.constants';
import { buildPageTree, canEditPage, extractPageText } from '@/modules/pages/lib/pages.lib';
import type { PageSummary } from '@/modules/pages/types/pages.types';

const page = (id: string, parentId: string | null, order: number): PageSummary => ({
  content: {
    content: [{ content: [{ text: id, type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  },
  id,
  lifecycle: 'ACTIVE',
  order,
  parentId,
  spaceId: 'space-1',
  title: id,
  version: 1,
});

describe('pages.lib', () => {
  it('builds the workspace list endpoint with trashed pages enabled', () => {
    expect(PAGE_API_ROUTES.list('space-1', true)).toBe('/api/v1/spaces/space-1/pages?includeTrashed=true');
    expect(PAGE_API_ROUTES.restore('space-1', 'page-1')).toBe('/api/v1/spaces/space-1/pages/page-1/restore');
  });

  it('keeps trashed pages read-only while allowing active pages to be edited', () => {
    expect(canEditPage(true, 'ACTIVE')).toBe(true);
    expect(canEditPage(true, 'TRASHED')).toBe(false);
    expect(canEditPage(false, 'ACTIVE')).toBe(false);
  });

  it('builds an ordered hierarchy from flat page summaries', () => {
    const tree = buildPageTree([page('child', 'root', 1), page('root', null, 2), page('first', null, 1)]);

    expect(tree.map((item) => item.page.id)).toEqual(['first', 'root']);
    expect(tree[1]?.children.map((item) => item.page.id)).toEqual(['child']);
  });

  it('extracts searchable text from structured page content', () => {
    const summary = page('page-1', null, 1);

    expect(extractPageText(summary.content)).toBe('page-1');
  });

  it('joins multiple extracted blocks with a blank line', () => {
    const content: PageSummary['content'] = {
      content: [
        { content: [{ text: 'First', type: 'text' }], type: 'paragraph' },
        { attrs: { alt: 'Image metadata', assetId: 'asset-image' }, type: 'image' },
        { content: [{ text: 'Second', type: 'text' }], type: 'paragraph' },
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractPageText(content)).toBe('First\n\nSecond');
  });
});
