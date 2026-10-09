import { describe, expect, test } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { extractLinkTargetPageIds } from '@/modules/links/utils/links.content.utils';

const contentWithMentions = (): PageContent => ({
  content: [
    {
      content: [
        { attrs: { label: 'Target A', pageId: 'page-a', spaceId: 'space-a' }, type: 'mention' },
        { text: ' and ', type: 'text' },
        { attrs: { label: 'Target B', pageId: 'page-b', spaceId: 'space-a' }, type: 'mention' },
      ],
      type: 'paragraph',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
});

describe('extractLinkTargetPageIds', () => {
  test('extracts every mentioned page id from valid page content', () => {
    const targetPageIds = extractLinkTargetPageIds(contentWithMentions());

    expect(targetPageIds).toEqual(['page-a', 'page-b']);
  });

  test('returns an empty list for content without mentions', () => {
    const content: PageContent = {
      content: [{ content: [{ text: 'No links here', type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractLinkTargetPageIds(content)).toEqual([]);
  });

  test('returns null when the content does not match the page content contract', () => {
    expect(extractLinkTargetPageIds({ not: 'a page document' })).toBeNull();
  });

  test('returns null for null content', () => {
    expect(extractLinkTargetPageIds(null)).toBeNull();
  });
});
