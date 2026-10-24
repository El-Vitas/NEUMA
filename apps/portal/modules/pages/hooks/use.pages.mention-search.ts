'use client';

import { useCallback } from 'react';
import { useDebouncedSearch } from '@/shared/hooks/use.debounced-search.hook';
import { PAGE_MENTION_SEARCH_LIMIT } from '../links/constants/pages.mentions.constants';
import { gatherThePagesNamed } from '../links/lib/pages.mentions.lib';
import { searchPageMentionCandidatesAction } from '../links/server/actions/pages.mentions.actions';
import type { PageMentionCandidate, PagesMentionSearchResult } from '../links/types/pages.mentions.types';
import type { PageReference } from '../types/pages.types';

/** Pages already loaded answer immediately; the search adds pages this space does not hold. */
export const usePagesMentionSearch = (
  query: string | null,
  pagesAtHand: readonly PageReference[],
): PagesMentionSearchResult => {
  const ask = useCallback((asked: string) => searchPageMentionCandidatesAction({ query: asked }), []);
  const { candidates, isLoading } = useDebouncedSearch<PageMentionCandidate>(query, ask);

  return {
    candidates: query === null ? [] : gatherThePagesNamed(pagesAtHand, candidates, query, PAGE_MENTION_SEARCH_LIMIT),
    isLoading,
  };
};
