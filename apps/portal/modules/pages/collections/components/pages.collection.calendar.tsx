'use client';

import type { PageDateScale } from '@neuma/shared';
import { PAGE_DATE_SCALE, readPageTimelinePeriod, shiftPageCalendarDate } from '@neuma/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { EmptyState } from '@/shared/components/ui/empty-state';
import {
  PAGE_CALENDAR_DAYS_IN_A_WEEK,
  PAGE_CALENDAR_SCALES,
  PAGE_CALENDAR_WEEKDAY_STARTS,
} from '../constants/pages.calendar.constants';
import { PAGE_VIEW_CALENDAR_MAXIMUM_ROWS } from '../constants/pages.query.constants';
import { NO_WINDOW_ROWS } from '../constants/pages.window-rows.constants';
import { usePagesCalendarMoving } from '../hooks/use.pages.calendar-moving';
import { usePagesRowCreation } from '../hooks/use.pages.row-creation';
import { usePagesRowQuery } from '../hooks/use.pages.row-query';
import { usePagesViewSaving } from '../hooks/use.pages.view-saving';
import { usePagesWindowRows } from '../hooks/use.pages.window-rows';
import {
  buildCalendarCells,
  listCalendarGridDays,
  readCalendarWindowFilters,
  readNeighbourMonth,
} from '../lib/pages.calendar.lib';
import { buildCollectionViewHref } from '../lib/pages.collection.view-selection.lib';
import { setViewDateScale } from '../lib/pages.view-filtering.lib';
import type { PageRow, PageSchema, PageSchemaView } from '../types/pages.schema.types';
import { PagesCollectionCalendarDay } from './pages.collection.calendar.day';
import { PagesCollectionDateNavigation } from './pages.collection.date-navigation';
import { PagesCollectionDateScale } from './pages.collection.date-scale';
import { PagesCollectionNewRow } from './pages.collection.new-row';

interface IProps {
  readonly activeViewName: string;
  readonly canEdit: boolean;
  /** Where to read what changed after those rows were read; null when the calendar cannot follow changes. */
  readonly changesCursor?: null | string;
  /** Null until the view defines which property places each row. */
  readonly dateProperty: null | string;
  /** The day a week is drawn around; the grid of a month is drawn around `month`. */
  readonly day: string;
  /** The grid holds more rows than the calendar reads, so `rows` are the first ones. */
  readonly isTruncated: boolean;
  /** The month the server read the grid of, as `YYYY-MM`. */
  readonly month: string;
  /** Every row whose dates reach a day the grid draws, leading and trailing days included. */
  readonly rows: readonly PageRow[];
  readonly scale: Extract<PageDateScale, 'MONTH' | 'WEEK'>;
  readonly schema: PageSchema;
  readonly spaceId: string;
  /** Rows with no date, which fall on no day and are not among `rows`. */
  readonly undated: number;
  readonly view: PageSchemaView;
  /** Who looks; null when the browser does not know, and a filter that names the reader then goes to the server. */
  readonly viewerId?: null | string;
}

/** The server reads the rows of the grid of a month or of a week, so moving through time asks it for the new grid. */
export const PagesCollectionCalendar = ({
  activeViewName,
  canEdit,
  changesCursor = null,
  dateProperty,
  day,
  isTruncated,
  month,
  rows: drawnRows,
  scale,
  schema,
  spaceId,
  undated: drawnUndated,
  view,
  viewerId = null,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const { quickFilter, search } = usePagesRowQuery();
  const locale = useLocale();
  const router = useRouter();
  const [isReading, startReading] = useTransition();
  const today = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);
  const { rows, undated } = usePagesWindowRows({
    changesCursor,
    dateProperty,
    isTruncated,
    listsUndated: false,
    pageId: schema.pageId,
    properties: schema.properties,
    rows: drawnRows,
    spaceId,
    undated: drawnUndated,
    undatedRows: NO_WINDOW_ROWS,
    view,
    viewerId,
    windowFilters: readCalendarWindowFilters(dateProperty, scale, day, month),
  });
  const moving = usePagesCalendarMoving(dateProperty, spaceId, rows);
  const viewSaving = usePagesViewSaving(schema, activeViewName, spaceId);
  const creation = usePagesRowCreation({
    collectionPageId: schema.pageId,
    placedByKey: dateProperty ?? '',
    properties: schema.properties,
    spaceId,
  });
  const goTo = (target: { readonly day?: string; readonly month?: string }): void =>
    startReading(() =>
      router.replace(buildCollectionViewHref(activeViewName, { ...target, quickFilter, search }), { scroll: false }),
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

  const isWeek = scale === PAGE_DATE_SCALE.WEEK;
  const days = listCalendarGridDays(scale, month, day);
  /** Includes a drop the server has not confirmed yet. */
  const cells = buildCalendarCells(days, rows, (row) => readPageTimelinePeriod(moving.valueOf(row), null));
  const dayAt = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
  const title = isWeek
    ? `${dayLabelOf.format(dayAt(days[0]?.date ?? day))} – ${dayLabelOf.format(dayAt(days.at(-1)?.date ?? day))}`
    : monthOf.format(dayAt(`${month}-01`));

  const createOn = (date: string, rowTitle: string): void => {
    setNamingOn(null);
    creation.createRowIn(date, rowTitle);
  };

  return (
    <div aria-busy={isReading} className="space-y-2" data-testid="collection-calendar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PagesCollectionDateNavigation
          earlierLabel={isWeek ? t('calendarEarlierWeek') : t('calendarEarlierMonth')}
          laterLabel={isWeek ? t('calendarLaterWeek') : t('calendarLaterMonth')}
          onEarlier={() =>
            isWeek
              ? goTo({ day: shiftPageCalendarDate(day, -PAGE_CALENDAR_DAYS_IN_A_WEEK) })
              : goTo({ month: readNeighbourMonth(month, 'EARLIER') })
          }
          onLater={() =>
            isWeek
              ? goTo({ day: shiftPageCalendarDate(day, PAGE_CALENDAR_DAYS_IN_A_WEEK) })
              : goTo({ month: readNeighbourMonth(month, 'LATER') })
          }
          onToday={() => (isWeek ? goTo({ day: today }) : goTo({ month: today.slice(0, 'YYYY-MM'.length) }))}
          title={title}
          todayLabel={t('calendarToday')}
        />
        {canEdit && (
          <PagesCollectionDateScale
            disabled={viewSaving.isSaving}
            label={t('calendarScale')}
            onChange={(next) => viewSaving.apply((current) => setViewDateScale(current, activeViewName, next))}
            scales={PAGE_CALENDAR_SCALES}
            value={scale}
          />
        )}
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
            {weekdayOf.format(dayAt(date))}
          </span>
        ))}
        {cells.map((cell) => (
          <PagesCollectionCalendarDay
            canEdit={canEdit}
            cell={cell}
            dayLabel={dayLabelOf.format(dayAt(cell.date))}
            isTall={isWeek}
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
          label={t('newRowOn', { day: dayLabelOf.format(dayAt(namingOn)) })}
          onCancel={() => setNamingOn(null)}
          onConfirm={(rowTitle) => createOn(namingOn, rowTitle)}
        />
      )}
      {/* Rows without a date fall on no day; the count keeps them from looking deleted. */}
      {undated > 0 && <p className="px-1 text-muted-foreground text-xs">{t('calendarUndated', { count: undated })}</p>}
    </div>
  );
};
