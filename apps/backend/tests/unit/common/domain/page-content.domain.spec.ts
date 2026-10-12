import { describe, expect, test } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { extractPageContentMentionIds } from '@/common/domain/page-content.domain';

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

describe('extractPageContentMentionIds', () => {
  test('extracts every mentioned page id from valid page content', () => {
    expect(extractPageContentMentionIds(contentWithMentions())).toEqual(['page-a', 'page-b']);
  });

  test('returns an empty list for content without mentions', () => {
    const content: PageContent = {
      content: [{ content: [{ text: 'No mentions here', type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractPageContentMentionIds(content)).toEqual([]);
  });

  test('returns null when the content does not match the page content contract', () => {
    expect(extractPageContentMentionIds({ not: 'a page document' })).toBeNull();
  });

  test('returns null for null content', () => {
    expect(extractPageContentMentionIds(null)).toBeNull();
  });
});
