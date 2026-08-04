import { describe, expect, test } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { extractPageContentText } from '@/modules/search/utils/search.content.utils';

describe('extractPageContentText', () => {
  test('joins extracted text blocks with a single space', () => {
    const content: PageContent = {
      content: [
        { content: [{ text: 'First', type: 'text' }], type: 'paragraph' },
        { content: [{ text: 'Second', type: 'text' }], type: 'paragraph' },
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractPageContentText(content)).toBe('First Second');
  });
});
