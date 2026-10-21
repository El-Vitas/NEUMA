'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { PAGE_CALENDAR_WEEKDAY_STARTS } from '../constants/pages.calendar.constants';
import { PAGE_VIEW_CALENDAR_MAXIMUM_ROWS } from '../constants/pages.query.constants';
import { usePagesCalendarMoving } from '../hooks/use.pages.calendar-moving';
import { usePagesRowCreation } from '../hooks/use.pages.row-creation';
import { usePagesRowQuery } from '../hooks/use.pages.row-query';
import { buildCalendarCells, readNeighbourMonth, readRowDate } from '../lib/pages.calendar.lib';
import { buildCollectionViewHref } from '../lib/pages.collection.view-selection.lib';
import type { PageRow, PageSchema } from '../types/pages.schema.types';
import { PagesCollectionCalendarDay } from './pages.collection.calendar.day';
import { PagesCollectionNewRow } from './pages.collection.new-row';

interface IProps {
  readonly activeViewName: string;
  readonly canEdit: boolean;
  /** Null until the view defines which property places each row. */
  readonly dateProperty: null | string;
  /** The grid holds more rows than the calendar reads, so `rows` are the first ones. */
  readonly isTruncated: boolean;
  /** The month the server read the grid of, as `YYYY-MM`. */
  readonly month: string;
  /** Every row that starts on a day the grid draws, leading and trailing days included. */
  readonly rows: readonly PageRow[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  /** Rows with no date, which fall on no day and are not among `rows`. */
  readonly undated: number;
}

/** The server reads the rows of the grid of a month, so changing month asks it again for the new grid. */
export const PagesCollectionCalendar = ({
  activeViewName,
  canEdit,
  dateProperty,
  isTruncated,
  month,
  rows,
  schema,
  spaceId,
  undated,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const { search } = usePagesRowQuery();
  const locale = useLocale();
  const router = useRouter();
  const [isReading, startReading] = useTransition();
  const today = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);
  const moving = usePagesCalendarMoving(dateProperty, spaceId, rows);
  const creation = usePagesRowCreation({
    collectionPageId: schema.pageId,
    placedByKey: dateProperty ?? '',
    properties: schema.properties,
    spaceId,
  });
  const goToMonth = (target: string): void =>
    startReading(() =>
      router.replace(buildCollectionViewHref(activeViewName, { month: target, search }), { scroll: false }),
    );
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
  const monthLabel = monthOf.format(new Date(`${month}-01T00:00:00.000Z`));

  const createOn = (date: string, title: string): void => {
    setNamingOn(null);
    creation.createRowIn(date, title);
  };

  return (
    <div aria-busy={isReading} className="space-y-2" data-testid="collection-calendar">
      <div className="flex items-center gap-1">
        <button
          aria-label={t('calendarEarlierMonth')}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => goToMonth(readNeighbourMonth(month, 'EARLIER'))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label={t('calendarLaterMonth')}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => goToMonth(readNeighbourMonth(month, 'LATER'))}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
        <h3 className="px-1 font-medium text-foreground text-sm first-letter:uppercase">{monthLabel}</h3>
        <button
          className="ml-1 rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
          onClick={() => goToMonth(today.slice(0, 'YYYY-MM'.length))}
          type="button"
        >
          {t('calendarToday')}
        </button>
      </div>
      {isTruncated && (
        <p className="px-1 text-muted-foreground text-xs" role="status">
          {t('calendarTruncated', { count: PAGE_VIEW_CALENDAR_MAXIMUM_ROWS })}
        </p>
      )}
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
      {undated > 0 && <p className="px-1 text-muted-foreground text-xs">{t('calendarUndated', { count: undated })}</p>}
    </div>
  );
};
