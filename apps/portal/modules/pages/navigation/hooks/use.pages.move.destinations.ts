'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { listPageMoveDestinationsAction } from '../../server/actions/pages.actions';
import { NO_PAGE_MOVE_DESTINATIONS } from '../constants/pages.move.constants';
import type { PageMoveDestinations } from '../types/pages.move.types';

/**
 * The top of each space while nothing is typed, and what the search finds once something is, so the answer never
 * depends on how many pages the spaces have. Typing waits for a pause; starting does not. Nothing is asked while
 * the caller is not active.
 */
export const usePagesMoveDestinations = (
  isActive: boolean,
  pageId: string,
  spaceId: string,
  query: string,
): PageMoveDestinations => {
  const [destinations, setDestinations] = useState<PageMoveDestinations>(NO_PAGE_MOVE_DESTINATIONS);

  useEffect(() => {
    if (!isActive) return;
    let isCurrent = true;
    const timeoutId = setTimeout(
      () => {
        void callAction(() => listPageMoveDestinationsAction({ pageId, query, spaceId })).then((result) => {
          if (!isCurrent) return;
          setDestinations(isActionSuccess<PageMoveDestinations>(result) ? result.data : NO_PAGE_MOVE_DESTINATIONS);
        });
      },
      query === '' ? 0 : DEFAULT_DEBOUNCE_MS,
    );
    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
    };
  }, [isActive, pageId, query, spaceId]);

  return destinations;
};
