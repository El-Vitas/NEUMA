'use client';

import { useEffect, useState } from 'react';
import { isActionSuccess } from '@/shared/lib/action-result';
import { listPageMoveDestinationsAction } from '../../server/actions/pages.actions';
import { NO_PAGE_MOVE_DESTINATIONS } from '../constants/pages.move.constants';
import type { PageMoveDestinations } from '../types/pages.move.types';

/** Fetched only once the list is open, to avoid a request nobody needs yet. */
export const usePagesMoveDestinations = (isOpen: boolean, pageId: string, spaceId: string): PageMoveDestinations => {
  const [destinations, setDestinations] = useState<PageMoveDestinations>(NO_PAGE_MOVE_DESTINATIONS);

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    void listPageMoveDestinationsAction({ pageId, spaceId }).then((result) => {
      if (!isCurrent) return;
      setDestinations(isActionSuccess<PageMoveDestinations>(result) ? result.data : NO_PAGE_MOVE_DESTINATIONS);
    });
    return () => {
      isCurrent = false;
    };
  }, [isOpen, pageId, spaceId]);

  return destinations;
};
