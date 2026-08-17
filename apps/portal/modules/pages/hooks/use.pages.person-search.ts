'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import { isActionSuccess } from '@/shared/lib/action-result';
import { searchPagePersonCandidatesAction } from '../server/actions/pages.person.actions';
import type { PagePersonSearchResult } from '../types/pages.editor.person.types';
import type { PagePersonOption } from '../types/pages.schema.types';

/**
 * The members of this space somebody may be naming, as they type.
 *
 * Unlike a page, a member is never already at hand: who belongs to a space
 * is only known by asking, so every letter typed asks again.
 */
export const usePagesPersonSearch = (query: string | null, spaceId: string): PagePersonSearchResult => {
  const [candidates, setCandidates] = useState<readonly PagePersonOption[]>([]);
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
      setCandidates(isActionSuccess<readonly PagePersonOption[]>(result) ? result.data : []);
    };

    const askForCandidates = (): void => {
      void searchPagePersonCandidatesAction({ query, spaceId }).then(receiveCandidates);
    };

    const startPersonSearch = (): ReturnType<typeof setTimeout> => {
      setIsLoading(true);
      return setTimeout(askForCandidates, DEFAULT_DEBOUNCE_MS);
    };

    const timeoutId = startPersonSearch();
    return () => {
      /** Moving the mark past this request is what makes a late answer arrive to nobody. */
      latestRequestIdRef.current += 1;
      clearTimeout(timeoutId);
    };
  }, [query, spaceId]);

  return {
    candidates: query === null ? [] : candidates,
    isLoading: query === null ? false : isLoading,
  };
};
