import { describe, expect, it } from 'bun:test';
import { toPageMentionCandidate } from '@/modules/pages/lib/pages.mentions.lib';
import type { SearchResult } from '@/shared/types/search.types';

describe('toPageMentionCandidate', () => {
  it('adapts a page search result into a mention candidate', () => {
    const searchResult: SearchResult = {
      contentType: 'page',
      rank: 1,
      snippet: [],
      sourceId: 'page-1',
      sourceType: 'PAGE',
      spaceId: 'space-1',
      title: 'Target Page',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(toPageMentionCandidate(searchResult)).toEqual({ id: 'page-1', label: 'Target Page', spaceId: 'space-1' });
  });
});
