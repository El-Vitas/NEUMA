'use client';

import { useCallback } from 'react';
import { useDebouncedSearch } from '@/shared/hooks/use.debounced-search.hook';
import { PAGE_MENTION_SEARCH_LIMIT } from '../links/constants/pages.mentions.constants';
import { gatherThePagesNamed } from '../links/lib/pages.mentions.lib';
import { searchPageMentionCandidatesAction } from '../links/server/actions/pages.mentions.actions';
import type { PageMentionCandidate, PagesMentionSearchResult } from '../links/types/pages.mentions.types';
import type { PageSummary } from '../types/pages.types';

/**
 * The pages somebody may be naming, as they type.
 *
 * The pages of this space are already in hand, so the first letter is answered
 * without waiting for anybody; the search is asked as well, because it reaches
 * pages this one does not hold.
 */
export const usePagesMentionSearch = (
  query: string | null,
  pagesAtHand: readonly PageSummary[],
): PagesMentionSearchResult => {
  const ask = useCallback((asked: string) => searchPageMentionCandidatesAction({ query: asked }), []);
  const { candidates, isLoading } = useDebouncedSearch<PageMentionCandidate>(query, ask);

  return {
    candidates: query === null ? [] : gatherThePagesNamed(pagesAtHand, candidates, query, PAGE_MENTION_SEARCH_LIMIT),
    isLoading,
  };
};
