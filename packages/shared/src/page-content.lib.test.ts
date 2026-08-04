import { describe, expect, test } from 'bun:test';
import {
  extractPageContentSegments,
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
