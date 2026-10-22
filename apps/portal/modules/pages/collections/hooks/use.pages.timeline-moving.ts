'use client';

import type { PageDateValue, PageDayRange, PageTimelineChangeMode } from '@neuma/shared';
import { buildPageTimelineChange, readPageTimelinePeriod } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useContext, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PAGE_VIEW_WRITES_CONTEXT } from '../constants/pages.view-writes.context.constants';
import { readRowDateValue } from '../lib/pages.calendar.lib';
import type { PageRow } from '../types/pages.schema.types';
import type { PagesTimelineChanges, PagesTimelineMoving } from '../types/pages.timeline.types';

/**
 * Moves and stretches bars optimistically and puts them back if the server refuses. A drag is one write of the dates
 * that changed and nothing else, so it never overwrites an edit someone made to the row meanwhile. What was changed is
 * forgotten when the server draws the rows again, since they then say it themselves.
 */
export const usePagesTimelineMoving = (
  startProperty: string,
  endProperty: null | string,
  spaceId: string,
  rows: readonly PageRow[],
): PagesTimelineMoving => {
  const tErrors = useTranslations('errors');
  const writes = useContext(PAGE_VIEW_WRITES_CONTEXT);
  const [changes, setChanges] = useState<PagesTimelineChanges>({});
  const [drawnRows, setDrawnRows] = useState(rows);
  const [, startWriting] = useTransition();

  if (drawnRows !== rows) {
    setDrawnRows(rows);
    setChanges({});
  }

  const readValue = (row: PageRow, property: string): null | PageDateValue =>
    changes[row.id]?.[property] ?? readRowDateValue(row, property);

  const undo = (rowId: string): void =>
    setChanges((previous) => {
      const { [rowId]: _undone, ...rest } = previous;
      return rest;
    });

  return {
    change: (rowId: string, mode: PageTimelineChangeMode, deltaDays: number) => {
      const row = rows.find((candidate) => candidate.id === rowId);
      const startValue = row === undefined ? null : readValue(row, startProperty);
      if (row === undefined || startValue === null || deltaDays === 0) return;
      const change = buildPageTimelineChange({
        deltaDays,
        endProperty,
        endValue: endProperty === null ? null : readValue(row, endProperty),
        mode,
        startProperty,
        startValue,
      });
      setChanges((previous) => ({ ...previous, [rowId]: { ...previous[rowId], ...change } }));
      startWriting(async () => {
        const settled = await writes.write(
          { kind: 'cell', pageId: rowId, propertyValues: change, spaceId },
          Object.keys(change).join(', '),
        );
        if (settled.kind !== 'rejected') return;
        undo(rowId);
        toast.error(tErrors('generic'));
      });
    },
    periodOf: (row: PageRow): null | PageDayRange =>
      readPageTimelinePeriod(readValue(row, startProperty), endProperty === null ? null : readValue(row, endProperty)),
  };
};
