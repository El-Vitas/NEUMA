'use client';

import { useCallback } from 'react';
import { useDebouncedSearch } from '@/shared/hooks/use.debounced-search.hook';
import { listPageDestinationsAction } from '../../../server/actions/pages.actions';
import type { PageDestination } from '../types/pages.editor.destination.types';

/**
 * Asked only once the picker is open: the top of the space while nothing is written, and what the search finds once
 * something is, so the answer never depends on how many pages the space has.
 */
export const usePagesEditorDestinations = (
  isOpen: boolean,
  spaceId: string,
  exceptPageId: string | null,
  query: string,
): readonly PageDestination[] => {
  const ask = useCallback(
    (asked: string) => listPageDestinationsAction({ exceptPageId, query: asked, spaceId }),
    [exceptPageId, spaceId],
  );
  return useDebouncedSearch<PageDestination>(isOpen ? query.trim() : null, ask).candidates;
};
