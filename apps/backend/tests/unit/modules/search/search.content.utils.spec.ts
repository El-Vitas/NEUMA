import { describe, expect, test } from 'bun:test';
import { extractPageContentText } from '@/modules/search/utils/search.content.utils';

describe('extractPageContentText', () => {
  test('extracts text from nested structured page content in document order', () => {
    expect(
      extractPageContentText({
        content: [
          { content: [{ text: 'Roadmap', type: 'text' }], type: 'heading', attrs: { level: 1 } },
          {
            content: [{ content: [{ content: [{ text: 'Q3', type: 'text' }], type: 'paragraph' }], type: 'list_item' }],
            type: 'bullet_list',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }),
    ).toBe('Roadmap Q3');
  });
});
