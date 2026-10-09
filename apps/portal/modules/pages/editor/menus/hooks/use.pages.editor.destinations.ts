'use client';

import { useEffect, useState } from 'react';
import { isActionSuccess } from '@/shared/lib/action-result';
import { listPageDestinationsAction } from '../../../server/actions/pages.actions';
import type { PageDestination } from '../types/pages.editor.destination.types';

/** Fetched only once the picker is open, to avoid a request nobody is waiting for. */
export const usePagesEditorDestinations = (
  isOpen: boolean,
  spaceId: string,
  exceptPageId: string | null,
): readonly PageDestination[] => {
  const [destinations, setDestinations] = useState<readonly PageDestination[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    void listPageDestinationsAction({ exceptPageId, spaceId }).then((result) => {
      if (!isCurrent) return;
      setDestinations(isActionSuccess<readonly PageDestination[]>(result) ? result.data : []);
    });
    return () => {
      isCurrent = false;
    };
  }, [exceptPageId, isOpen, spaceId]);

  return destinations;
};
