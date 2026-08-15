'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import { isActionSuccess } from '@/shared/lib/action-result';
import { PAGE_MENTION_SEARCH_LIMIT } from '../constants/pages.mentions.constants';
import { gatherThePagesNamed } from '../lib/pages.mentions.lib';
import { searchPageMentionCandidatesAction } from '../server/actions/pages.mentions.actions';
import type { PageMentionCandidate, PagesMentionSearchResult } from '../types/pages.mentions.types';
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
  const [candidates, setCandidates] = useState<readonly PageMentionCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    if (query === null) return;

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    /** An answer is only worth reading while it is still the one being waited for. */
    const receiveCandidates = (result: unknown): void => {
      if (latestRequestIdRef.current !== requestId) return;
      setIsLoading(false);
      setCandidates(isActionSuccess<readonly PageMentionCandidate[]>(result) ? result.data : []);
    };

    const askForCandidates = (): void => {
      void searchPageMentionCandidatesAction({ query }).then(receiveCandidates);
    };

    const startMentionSearch = (): ReturnType<typeof setTimeout> => {
      setIsLoading(true);
      return setTimeout(askForCandidates, DEFAULT_DEBOUNCE_MS);
    };

    const timeoutId = startMentionSearch();
    return () => {
      /** Moving the mark past this request is what makes a late answer arrive to nobody. */
      latestRequestIdRef.current += 1;
      clearTimeout(timeoutId);
    };
  }, [query]);

  return {
    candidates: query === null ? [] : gatherThePagesNamed(pagesAtHand, candidates, query, PAGE_MENTION_SEARCH_LIMIT),
    isLoading: query === null ? false : isLoading,
  };
};
