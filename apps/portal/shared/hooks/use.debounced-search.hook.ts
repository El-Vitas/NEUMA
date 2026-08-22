'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import { isActionSuccess } from '@/shared/lib/action-result';
import type { DebouncedSearchResult } from '@/shared/types/debounced-search.types';

/**
 * What somebody may be naming, as they type.
 *
 * Two things happen here that are easy to get wrong separately: the question is
 * held back until the typing settles, and an answer that arrives after a newer
 * question was asked is dropped rather than shown. Written once so a second
 * finder cannot get either half wrong on its own.
 *
 * What is kept is the answer together with the question it answers, so whether
 * the search is still running is read from those two rather than followed in a
 * flag of its own — a flag and a list can disagree, and a question and its own
 * answer cannot. The last answer stays on screen meanwhile, so the list does
 * not blink empty between letters.
 *
 * `ask` has to keep its identity between renders, or every render starts the
 * search over.
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
