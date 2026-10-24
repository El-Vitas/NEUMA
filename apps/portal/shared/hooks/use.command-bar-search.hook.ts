'use client';

import { useEffect, useRef, useState } from 'react';
import { searchInstantPageCandidatesAction } from '@/modules/search/server/actions/search.instant.actions';
import type { SearchInstantPageCandidate } from '@/modules/search/types/search.types';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import type { UseCommandBarSearchResult } from '@/shared/types/use.command-bar-search.types';

/** Loading is derived from the gap between the current query and the answered one, never set inside the effect. */
export const useCommandBarSearch = (query: string): UseCommandBarSearchResult => {
  const [pages, setPages] = useState<readonly SearchInstantPageCandidate[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState('');
  const latestRequestIdRef = useRef(0);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery === '') return;

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const receiveCandidates = (result: unknown): void => {
      if (latestRequestIdRef.current !== requestId) return;
      setPages(isActionSuccess<readonly SearchInstantPageCandidate[]>(result) ? result.data : []);
      setResolvedQuery(trimmedQuery);
    };

    const timeoutId = setTimeout(() => {
      void callAction(() => searchInstantPageCandidatesAction({ query: trimmedQuery })).then(receiveCandidates);
    }, DEFAULT_DEBOUNCE_MS);

    return () => {
      latestRequestIdRef.current += 1;
      clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  return {
    isLoading: trimmedQuery !== '' && trimmedQuery !== resolvedQuery,
    pages: trimmedQuery === resolvedQuery ? pages : [],
  };
};
