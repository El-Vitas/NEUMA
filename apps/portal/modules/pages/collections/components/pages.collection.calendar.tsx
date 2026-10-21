'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { PAGE_CALENDAR_WEEKDAY_STARTS } from '../constants/pages.calendar.constants';
import { usePagesCalendarMoving } from '../hooks/use.pages.calendar-moving';
import { usePagesRowCreation } from '../hooks/use.pages.row-creation';
import {
  buildCalendarCells,
  listRowsWithoutDate,
  readNeighbourMonth,
  readRowDate,
  resolveCalendarMonth,
} from '../lib/pages.calendar.lib';
import type { PageRow, PageSchema } from '../types/pages.schema.types';
import { PagesCollectionCalendarDay } from './pages.collection.calendar.day';
import { PagesCollectionNewRow } from './pages.collection.new-row';

interface IProps {
  readonly canEdit: boolean;
  /** Null until the view defines which property places each row. */
  readonly dateProperty: null | string;
  readonly rows: readonly PageRow[];
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/** Changing month redistributes the rows already loaded instead of refetching. */
export const PagesCollectionCalendar = ({ canEdit, dateProperty, rows, schema, spaceId }: IProps) => {
  const t = useTranslations('pages.collection');
  const locale = useLocale();
  const today = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);
  const moving = usePagesCalendarMoving(dateProperty, spaceId, rows);
  const creation = usePagesRowCreation({
    collectionPageId: schema.pageId,
    placedByKey: dateProperty ?? '',
    properties: schema.properties,
    spaceId,
  });
  const [month, setMonth] = useState(() => resolveCalendarMonth(null, rows, dateProperty, today));
  const [namingOn, setNamingOn] = useState<null | string>(null);
  /** Built once per locale: creating a date formatter is costly and the calendar re-renders on every drag. */
  const monthOf = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC', year: 'numeric' }),
    [locale],
  );
  const weekdayOf = useMemo(() => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }), [locale]);
  const dayLabelOf = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
    [locale],
  );

  if (dateProperty === null) return <EmptyState message={t('calendarNeedsDate')} />;

  /** Includes a drop the server has not confirmed yet. */
  const dateOf = (row: PageRow): null | string => moving.dateOf(row, readRowDate(row, dateProperty));
  const cells = buildCalendarCells(month, rows, dateOf);
  const undated = listRowsWithoutDate(rows, dateOf);
  const monthLabel = monthOf.format(new Date(`${month}-01T00:00:00.000Z`));

  const createOn = (date: string, title: string): void => {
    setNamingOn(null);
    creation.createRowIn(date, title);
  };

  return (
    <div className="space-y-2" data-testid="collection-calendar">
      <div className="flex items-center gap-1">
        <button
          aria-label={t('calendarEarlierMonth')}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setMonth(readNeighbourMonth(month, 'EARLIER'))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label={t('calendarLaterMonth')}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setMonth(readNeighbourMonth(month, 'LATER'))}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
        <h3 className="px-1 font-medium text-foreground text-sm first-letter:uppercase">{monthLabel}</h3>
        <button
          className="ml-1 rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
          onClick={() => setMonth(today.slice(0, 'YYYY-MM'.length))}
          type="button"
        >
          {t('calendarToday')}
        </button>
      </div>
      <div className="grid grid-cols-7 border-border/60 border-r border-b">
        {PAGE_CALENDAR_WEEKDAY_STARTS.map((date) => (
          <span
            className="border-border/60 border-t border-l px-2 py-1 text-muted-foreground text-xs first-letter:uppercase"
            key={date}
          >
            {weekdayOf.format(new Date(`${date}T00:00:00.000Z`))}
          </span>
        ))}
        {cells.map((cell) => (
          <PagesCollectionCalendarDay
            canEdit={canEdit}
            cell={cell}
            dayLabel={dayLabelOf.format(new Date(`${cell.date}T00:00:00.000Z`))}
            isToday={cell.date === today}
            key={cell.date}
            moving={moving}
            onCreate={() => setNamingOn(cell.date)}
          />
        ))}
      </div>
      {namingOn !== null && (
        <PagesCollectionNewRow
          disabled={creation.isCreating}
          label={t('newRowOn', { day: dayLabelOf.format(new Date(`${namingOn}T00:00:00.000Z`)) })}
          onCancel={() => setNamingOn(null)}
          onConfirm={(title) => createOn(namingOn, title)}
        />
      )}
      {/* Rows without a date fall on no day; the count keeps them from looking deleted. */}
      {undated.length > 0 && (
        <p className="px-1 text-muted-foreground text-xs">{t('calendarUndated', { count: undated.length })}</p>
      )}
    </div>
  );
};
