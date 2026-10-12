'use client';

import { useCallback } from 'react';
import { useDebouncedSearch } from '@/shared/hooks/use.debounced-search.hook';
import type { PagePersonOption } from '../collections/types/pages.schema.types';
import type { PagePersonSearchResult } from '../editor/text/types/pages.editor.person.types';
import { searchPagePersonCandidatesAction } from '../links/server/actions/pages.person.actions';

/** Members are never preloaded, so every keystroke queries again. */
export const usePagesPersonSearch = (query: string | null, spaceId: string): PagePersonSearchResult => {
  const ask = useCallback((asked: string) => searchPagePersonCandidatesAction({ query: asked, spaceId }), [spaceId]);
  return useDebouncedSearch<PagePersonOption>(query, ask);
};
