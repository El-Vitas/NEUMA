import { describe, expect, test } from 'bun:test';
import {
  extractPageContentSegments,
  extractPageMentionIds,
  joinPageContentSegmentsForDisplay,
  joinPageContentSegmentsForSearch,
} from './page-content.lib.js';
import type { PageContent } from './schemas/page-content.schema.js';
import { pageContentSchema } from './schemas/page-content.schema.js';

const structuredContent: PageContent = {
  content: [
    { attrs: { alt: 'Image metadata', assetId: 'asset-image' }, type: 'image' },
    {
      content: [
        {
          content: [
            {
              content: [{ content: [{ text: 'Table text', type: 'text' }], type: 'paragraph' }],
              type: 'table_cell',
            },
          ],
          type: 'table_row',
        },
      ],
      type: 'table',
    },
    {
      attrs: { summary: 'Toggle summary' },
      content: [
        {
          content: [
            {
              content: [{ content: [{ text: 'Toggle text', type: 'text' }], type: 'paragraph' }],
              type: 'list_item',
            },
          ],
          type: 'bullet_list',
        },
      ],
      type: 'toggle',
    },
    { attrs: { assetId: 'asset-file', caption: 'File metadata' }, type: 'file' },
    { attrs: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc123' }, type: 'embed' },
  ],
  schemaVersion: 1,
  type: 'doc',
};

test('the structured content fixture is valid against the shared page-content contract', () => {
  expect(pageContentSchema.parse(structuredContent)).toBeTruthy();
});

describe('extractPageContentSegments', () => {
  test('extracts leaf text in document order', () => {
    const content: PageContent = {
      content: [
        { content: [{ text: 'Roadmap', type: 'text' }], type: 'heading', attrs: { level: 1 } },
        {
          content: [{ content: [{ content: [{ text: 'Q3', type: 'text' }], type: 'paragraph' }], type: 'list_item' }],
          type: 'bullet_list',
        },
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractPageContentSegments(content)).toEqual(['Roadmap', 'Q3']);
  });

  test('ignores asset and embed leaves while descending into nested blocks', () => {
    expect(extractPageContentSegments(structuredContent)).toEqual(['Table text', 'Toggle text']);
  });

  test('includes a mention label as a text segment, interleaved with surrounding text', () => {
    const content: PageContent = {
      content: [
        {
          content: [
            { text: 'See ', type: 'text' },
            { attrs: { label: 'Q3 Planning', pageId: 'page-1', spaceId: 'space-1' }, type: 'mention' },
            { text: ' for details', type: 'text' },
          ],
          type: 'paragraph',
        },
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractPageContentSegments(content)).toEqual(['See ', 'Q3 Planning', ' for details']);
  });
});

describe('extractPageMentionIds', () => {
  test('returns an empty array for a document with no mentions', () => {
    expect(extractPageMentionIds(structuredContent)).toEqual([]);
  });

  test('finds mentions nested deep inside a list, a table and a toggle, in document order', () => {
    const content: PageContent = {
      content: [
        {
          content: [
            {
              content: [
                {
                  content: [
                    { attrs: { label: 'List target', pageId: 'page-list', spaceId: 'space-1' }, type: 'mention' },
                  ],
                  type: 'paragraph',
                },
              ],
              type: 'list_item',
            },
          ],
          type: 'bullet_list',
        },
        {
          content: [
            {
              content: [
                {
                  content: [
                    {
                      content: [
                        { attrs: { label: 'Table target', pageId: 'page-table', spaceId: 'space-1' }, type: 'mention' },
                      ],
                      type: 'paragraph',
                    },
                  ],
                  type: 'table_cell',
                },
              ],
              type: 'table_row',
            },
          ],
          type: 'table',
        },
        {
          attrs: { summary: 'Toggle summary' },
          content: [
            {
              content: [
                { attrs: { label: 'Toggle target', pageId: 'page-toggle', spaceId: 'space-1' }, type: 'mention' },
              ],
              type: 'paragraph',
            },
          ],
          type: 'toggle',
        },
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractPageMentionIds(content)).toEqual(['page-list', 'page-table', 'page-toggle']);
  });

  test('deduplicates repeated references to the same page, keeping the first occurrence order', () => {
    const content: PageContent = {
      content: [
        {
          content: [
            { attrs: { label: 'First mention', pageId: 'page-1', spaceId: 'space-1' }, type: 'mention' },
            { attrs: { label: 'Second target', pageId: 'page-2', spaceId: 'space-1' }, type: 'mention' },
            { attrs: { label: 'Repeated mention', pageId: 'page-1', spaceId: 'space-1' }, type: 'mention' },
          ],
          type: 'paragraph',
        },
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractPageMentionIds(content)).toEqual(['page-1', 'page-2']);
  });
});

describe('joinPageContentSegmentsForDisplay', () => {
  test('joins segments with a blank line', () => {
    expect(joinPageContentSegmentsForDisplay(extractPageContentSegments(structuredContent))).toBe(
      'Table text\n\nToggle text',
    );
  });
});

describe('joinPageContentSegmentsForSearch', () => {
  test('joins segments with a single space', () => {
    expect(joinPageContentSegmentsForSearch(extractPageContentSegments(structuredContent))).toBe(
      'Table text Toggle text',
    );
  });
});
