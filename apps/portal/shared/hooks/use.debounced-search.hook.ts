'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import { isActionSuccess } from '@/shared/lib/action-result';
import type { DebouncedSearchResult } from '@/shared/types/debounced-search.types';

/**
 * Debounces the query and drops answers to superseded queries. Loading is derived from the query and the query
 * its answer belongs to; the last answer stays on screen meanwhile. `ask` must be stable between renders, or
 * every render restarts the search.
 */
export const useDebouncedSearch = <T>(
  query: string | null,
  ask: (query: string) => Promise<unknown>,
): DebouncedSearchResult<T> => {
  const [answer, setAnswer] = useState<{ readonly candidates: readonly T[]; readonly query: string } | null>(null);

  useEffect(() => {
    if (query === null) return;

    let abandoned = false;
    const timeoutId = setTimeout(() => {
      void ask(query).then((result) => {
        if (abandoned) return;
        setAnswer({ candidates: isActionSuccess<readonly T[]>(result) ? result.data : [], query });
      });
    }, DEFAULT_DEBOUNCE_MS);

    return () => {
      abandoned = true;
      clearTimeout(timeoutId);
    };
  }, [ask, query]);

  return {
    candidates: query === null ? [] : (answer?.candidates ?? []),
    isLoading: query !== null && answer?.query !== query,
  };
};
