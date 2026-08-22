'use client';

import { useCallback } from 'react';
import { useDebouncedSearch } from '@/shared/hooks/use.debounced-search.hook';
import type { PagePersonSearchResult } from '../editor/text/types/pages.editor.person.types';
import { searchPagePersonCandidatesAction } from '../server/actions/pages.person.actions';
import type { PagePersonOption } from '../types/pages.schema.types';

/**
 * The members of this space somebody may be naming, as they type.
 *
 * Unlike a page, a member is never already at hand: who belongs to a space is
 * only known by asking, so every letter typed asks again.
 */
export const usePagesPersonSearch = (query: string | null, spaceId: string): PagePersonSearchResult => {
  const ask = useCallback((asked: string) => searchPagePersonCandidatesAction({ query: asked, spaceId }), [spaceId]);
  return useDebouncedSearch<PagePersonOption>(query, ask);
};
