'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError } from '@/shared/lib/action-result';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type { PagesCalendarMoving } from '../types/pages.calendar.types';
import type { PageRow } from '../types/pages.schema.types';

/**
 * Moves optimistically and reverts if the server refuses. Only the date is sent: sending the whole row
 * would overwrite edits someone else made while the entry was being dragged.
 */
export const usePagesCalendarMoving = (dateProperty: null | string, spaceId: string): PagesCalendarMoving => {
  const tErrors = useTranslations('errors');
  const [moved, setMoved] = useState<Readonly<Record<string, string>>>({});
  const [carried, setCarried] = useState<null | string>(null);
  const [, startMoving] = useTransition();

  return {
    carried,
    // Includes drops the server has not confirmed yet.
    dateOf: (row: PageRow, stored: null | string) => moved[row.id] ?? stored,
    forget: () => setCarried(null),
    moveTo: (rowId: string, date: string) => {
      setCarried(null);
      if (dateProperty === null) return;
      setMoved((current) => ({ ...current, [rowId]: date }));
      startMoving(async () => {
        const saved = await updatePageRowPropertiesAction({
          pageId: rowId,
          propertyValues: { [dateProperty]: date },
          spaceId,
        });
        if (!hasActionError(saved)) return;
        setMoved((current) => {
          const { [rowId]: _undone, ...rest } = current;
          return rest;
        });
        toast.error(tErrors('generic'));
      });
    },
    take: setCarried,
  };
};
