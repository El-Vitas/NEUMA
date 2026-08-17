import { describe, expect, it } from 'bun:test';
import { toSearchInstantPageCandidate } from '@/modules/search/lib/search.instant.lib';
import type { SearchResult } from '@/shared/types/search.types';

const searchResult: SearchResult = {
  contentType: 'guide',
  rank: 0.8,
  snippet: [],
  sourceId: 'page-1',
  sourceType: 'PAGE',
  spaceId: 'space-1',
  title: 'Onboarding plan',
  updatedAt: '2026-08-03T12:00:00.000Z',
};

describe('toSearchInstantPageCandidate', () => {
  it('keeps only the identity a quick finder result needs', () => {
    expect(toSearchInstantPageCandidate(searchResult)).toEqual({
      id: 'page-1',
      spaceId: 'space-1',
      title: 'Onboarding plan',
    });
  });
});
