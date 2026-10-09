'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import { isActionSuccess } from '@/shared/lib/action-result';
import { ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH } from '../constants/access-tokens.constants';
import { searchGrantablePagesAction } from '../server/actions/access-tokens.actions';
import type { AccessTokenPageOption, AccessTokenPageSearch } from '../types/access-tokens.types';

/**
 * Las páginas que responden a lo escrito, para nombrarlas en un token.
 *
 * Espera a que se deje de escribir, y una respuesta que llega tarde para una
 * búsqueda ya reemplazada se descarta. Que siga buscando se lee de la
 * diferencia entre lo escrito y lo que la respuesta contesta, no de un estado
 * aparte que pueda quedar desfasado.
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
