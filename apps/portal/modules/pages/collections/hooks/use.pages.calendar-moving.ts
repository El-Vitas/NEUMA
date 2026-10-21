'use client';

import type { PageDateValue } from '@neuma/shared';
import { shiftPageCalendarDate } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError } from '@/shared/lib/action-result';
import { readRowDateValue } from '../lib/pages.calendar.lib';
import { moveDateValueTo } from '../lib/pages.dates.lib';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type { PagesCalendarMoving } from '../types/pages.calendar.types';
import type { PageRow } from '../types/pages.schema.types';

/**
 * Moves optimistically and reverts if the server refuses. Only the date is sent: sending the whole row
 * would overwrite edits someone else made while the entry was being dragged. A range keeps its length, and lands by
 * the day it was grabbed by.
 */
export const usePagesCalendarMoving = (
  dateProperty: null | string,
  spaceId: string,
  rows: readonly PageRow[],
): PagesCalendarMoving => {
  const tErrors = useTranslations('errors');
  const [moved, setMoved] = useState<Readonly<Record<string, PageDateValue>>>({});
  const [carried, setCarried] = useState<null | string>(null);
  const [daysIntoEntry, setDaysIntoEntry] = useState(0);
  const [, startMoving] = useTransition();

  const undo = (rowId: string): void =>
    setMoved((previous) => {
      const { [rowId]: _undone, ...rest } = previous;
      return rest;
    });

  return {
    carried,
    // Includes drops the server has not confirmed yet.
    dateOf: (row: PageRow, stored: null | string) => moved[row.id]?.start.slice(0, 'YYYY-MM-DD'.length) ?? stored,
    forget: () => setCarried(null),
    moveTo: (rowId: string, date: string) => {
      setCarried(null);
      if (dateProperty === null) return;
      const row = rows.find((candidate) => candidate.id === rowId);
      const current = row === undefined ? null : readRowDateValue(row, dateProperty);
      const next = moveDateValueTo(current, shiftPageCalendarDate(date, -daysIntoEntry));
      setDaysIntoEntry(0);
      setMoved((previous) => ({ ...previous, [rowId]: next }));
      startMoving(async () => {
        const saved = await updatePageRowPropertiesAction({
          pageId: rowId,
          propertyValues: { [dateProperty]: next },
          spaceId,
        });
        if (!hasActionError(saved)) return;
        undo(rowId);
        toast.error(tErrors('generic'));
      });
    },
    take: (rowId: string, offset = 0) => {
      setCarried(rowId);
      setDaysIntoEntry(offset);
    },
    valueOf: (row: PageRow) => moved[row.id] ?? (dateProperty === null ? null : readRowDateValue(row, dateProperty)),
  };
};
