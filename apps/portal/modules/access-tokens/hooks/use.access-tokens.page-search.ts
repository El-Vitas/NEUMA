'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import { isActionSuccess } from '@/shared/lib/action-result';
import { ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH } from '../constants/access-tokens.constants';
import { searchGrantablePagesAction } from '../server/actions/access-tokens.actions';
import type { AccessTokenPageOption, AccessTokenPageSearch } from '../types/access-tokens.types';

/**
 * Debounced; a late response to a superseded query is discarded. "Still searching" is derived from the gap
 * between the typed query and the answered one, not from separate state that could go stale.
 */
export const useAccessTokensPageSearch = (query: string): AccessTokenPageSearch => {
  const [pages, setPages] = useState<readonly AccessTokenPageOption[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState('');
  const [hasFailed, setHasFailed] = useState(false);
  const latestRequestIdRef = useRef(0);
  const trimmedQuery = query.trim();
  const isLongEnough = trimmedQuery.length >= ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!isLongEnough) return;

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const receivePages = (result: unknown): void => {
      if (latestRequestIdRef.current !== requestId) return;
      const isSuccess = isActionSuccess<readonly AccessTokenPageOption[]>(result);
      setPages(isSuccess ? result.data : []);
      setHasFailed(!isSuccess);
      setResolvedQuery(trimmedQuery);
    };

    const timeoutId = setTimeout(() => {
      void searchGrantablePagesAction({ query: trimmedQuery }).then(receivePages, () => receivePages(undefined));
    }, DEFAULT_DEBOUNCE_MS);

    return () => {
      latestRequestIdRef.current += 1;
      clearTimeout(timeoutId);
    };
  }, [isLongEnough, trimmedQuery]);

  const isAnswered = isLongEnough && trimmedQuery === resolvedQuery;
  return {
    hasFailed: isAnswered && hasFailed,
    isSearching: isLongEnough && !isAnswered,
    pages: isAnswered ? pages : [],
  };
};
