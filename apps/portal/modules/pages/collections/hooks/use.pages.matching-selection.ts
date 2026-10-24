'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { readPageMatchingRowsAction } from '../server/actions/pages.collections.actions';
import type { PageMatchingRows } from '../types/pages.query.types';
import type { PagesMatchingSelection } from '../types/pages.row-selection.types';
import { usePagesRowQuery } from './use.pages.row-query';
import { usePagesRowSelection } from './use.pages.row-selection';

/**
 * Marks every row the view lets through with the words searched, however many were loaded. The server answers with
 * the ids, or says there are too many: part of them is never marked, since a delete would then look done.
 */
export const usePagesMatchingSelection = (pageId: string, spaceId: string, viewId: string): PagesMatchingSelection => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const selection = usePagesRowSelection();
  const { quickFilter, search } = usePagesRowQuery();
  const [isReading, startReading] = useTransition();

  const selectAllMatching = (): void => {
    startReading(async () => {
      const matching = await callAction(() =>
        readPageMatchingRowsAction({ pageId, quickFilter, search, spaceId, viewId }),
      );
      if (!isActionSuccess<PageMatchingRows>(matching)) {
        toast.error(tErrors('generic'));
        return;
      }
      if (matching.data.isTooMany) {
        toast.error(t('bulkTooMany'));
        return;
      }
      selection?.selectMany(matching.data.rowIds, matching.data.valuesByRow);
    });
  };

  return { isReading, selectAllMatching };
};
