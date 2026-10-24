'use client';

import type { PageDateScale } from '@neuma/shared';
import {
  listPageTimelineTicks,
  PAGE_DATE_SCALE,
  PAGE_DATE_SCALE_VALUES,
  readPageTimelineOffset,
  shiftPageTimelineAnchor,
} from '@neuma/shared';
import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { PAGE_TIMELINE_LABEL_WIDTH, PAGE_TIMELINE_PIXELS_PER_DAY } from '../constants/pages.timeline.constants';
import { usePagesRowCreation } from '../hooks/use.pages.row-creation';
import { usePagesRowQuery } from '../hooks/use.pages.row-query';
import { usePagesTimelineDragging } from '../hooks/use.pages.timeline-dragging';
import { usePagesTimelineMoving } from '../hooks/use.pages.timeline-moving';
import { usePagesViewSaving } from '../hooks/use.pages.view-saving';
import { usePagesWindowRows } from '../hooks/use.pages.window-rows';
import { buildCollectionViewHref } from '../lib/pages.collection.view-selection.lib';
import { buildTimelineEntries, readTimelineLiveSeed } from '../lib/pages.timeline.lib';
import { setViewDateScale } from '../lib/pages.view-filtering.lib';
import type { PageRow, PageSchema, PageSchemaView, PageTimelineReading } from '../types/pages.schema.types';
import { PagesCollectionDateNavigation } from './pages.collection.date-navigation';
import { PagesCollectionDateScale } from './pages.collection.date-scale';
import { PagesCollectionNewRow } from './pages.collection.new-row';
import { PagesCollectionTimelineDateSettings } from './pages.collection.timeline.date-settings';
import { PagesCollectionTimelineHeader } from './pages.collection.timeline.header';
import { PagesCollectionTimelineRows } from './pages.collection.timeline.rows';
import { PagesCollectionTimelineUndated } from './pages.collection.timeline.undated';

interface IProps {
  readonly activeViewName: string;
  readonly canEdit: boolean;
  /** Where to read what changed after those rows were read; null when the timeline cannot follow changes. */
  readonly changesCursor?: null | string;
  /** Null until the view says which property holds where each row starts. */
  readonly dateProperty: null | string;
  /** Null when the end is read from the range of the start property. */
  readonly endDateProperty: null | string;
  /** Every row that lasts into the window the server read. */
  readonly rows: readonly PageRow[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly timeline: PageTimelineReading | undefined;
  readonly view: PageSchemaView;
  /** Who looks; null when the browser does not know, and a filter that names the reader then goes to the server. */
  readonly viewerId?: null | string;
}

/**
 * The server reads the rows that last into a window of days, so going on or back asks it for the next window. The
 * rows are drawn only as far as they are in view, so a window of thousands stays as light as one of a few.
 */
export const PagesCollectionTimeline = ({
  activeViewName,
  canEdit,
  changesCursor = null,
  dateProperty,
  endDateProperty,
  rows: drawnRows,
  schema,
  spaceId,
  timeline,
  view,
  viewerId = null,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const locale = useLocale();
  const router = useRouter();
  const { quickFilter, search } = usePagesRowQuery();
  const { rows, undated, undatedRows } = usePagesWindowRows({
    changesCursor,
    dateProperty,
    listsUndated: true,
    pageId: schema.pageId,
    properties: schema.properties,
    rows: drawnRows,
    spaceId,
    view,
    viewerId,
    ...readTimelineLiveSeed(timeline, dateProperty, endDateProperty),
  });
  const [isReading, startReading] = useTransition();
  const [isNaming, setIsNaming] = useState(false);
  const viewSaving = usePagesViewSaving(schema, activeViewName, spaceId);
  const scale = timeline?.scale ?? PAGE_DATE_SCALE.MONTH;
  const pixelsPerDay = PAGE_TIMELINE_PIXELS_PER_DAY[scale];
  const moving = usePagesTimelineMoving(dateProperty ?? '', endDateProperty, spaceId, rows);
  const dragging = usePagesTimelineDragging(pixelsPerDay, moving.change);
  const creation = usePagesRowCreation({
    collectionPageId: schema.pageId,
    placedByKey: dateProperty ?? '',
    properties: schema.properties,
    spaceId,
  });
  const titleFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC', year: 'numeric' }),
    [locale],
  );

  if (dateProperty === null || timeline === undefined) {
    return (
      <EmptyState
        action={
          canEdit ? (
            <PagesCollectionTimelineDateSettings
              activeViewName={activeViewName}
              dateProperty={dateProperty}
              endDateProperty={endDateProperty}
              isOpenInline
              schema={schema}
              spaceId={spaceId}
            />
          ) : undefined
        }
        message={t('timelineNeedsDate')}
      />
    );
  }

  const range = timeline.window;
  const ticks = listPageTimelineTicks(scale, range);
  const entries = buildTimelineEntries(rows, moving.periodOf, range, pixelsPerDay);
  const totalWidth = ticks.reduce((total, tick) => total + tick.spanDays, 0) * pixelsPerDay;
  const goTo = (day: string): void =>
    startReading(() =>
      router.replace(buildCollectionViewHref(activeViewName, { day, quickFilter, search }), { scroll: false }),
    );
  const startDate = titleFormat.format(new Date(`${range.start}T00:00:00.000Z`));
  const endDate = titleFormat.format(new Date(`${range.end}T00:00:00.000Z`));
  const title = `${startDate} – ${endDate}`;

  return (
    <div aria-busy={isReading} className="space-y-2" data-testid="collection-timeline">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PagesCollectionDateNavigation
          earlierLabel={t('timelineEarlier')}
          laterLabel={t('timelineLater')}
          onEarlier={() => goTo(shiftPageTimelineAnchor(scale, timeline.anchor, -1))}
          onLater={() => goTo(shiftPageTimelineAnchor(scale, timeline.anchor, 1))}
          onToday={() => goTo(timeline.today)}
          title={title}
          todayLabel={t('calendarToday')}
        />
        {canEdit && (
          <div className="flex items-center gap-1">
            <PagesCollectionDateScale
              disabled={viewSaving.isSaving}
              label={t('timelineScale')}
              onChange={(next: PageDateScale) =>
                viewSaving.apply((current) => setViewDateScale(current, activeViewName, next))
              }
              scales={PAGE_DATE_SCALE_VALUES}
              value={scale}
            />
            <PagesCollectionTimelineDateSettings
              activeViewName={activeViewName}
              dateProperty={dateProperty}
              endDateProperty={endDateProperty}
              schema={schema}
              spaceId={spaceId}
            />
            <Button
              aria-label={t('timelineAddRow')}
              className="min-h-11 rounded-md text-muted-foreground"
              onClick={() => setIsNaming(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
      </div>
      {timeline.isTruncated && (
        <output className="block px-1 text-muted-foreground text-xs">
          {t('timelineTruncated', { count: rows.length })}
        </output>
      )}
      {isNaming && (
        <PagesCollectionNewRow
          disabled={creation.isCreating}
          label={t('timelineNewRow')}
          onCancel={() => setIsNaming(false)}
          onConfirm={(rowTitle) => {
            setIsNaming(false);
            creation.createRowIn(timeline.today, rowTitle);
          }}
        />
      )}
      <section
        aria-label={t('timelineRows')}
        className="overflow-x-auto rounded-md border border-border/60"
        data-testid="timeline-scroller"
      >
        <div style={{ minWidth: '100%', width: PAGE_TIMELINE_LABEL_WIDTH + totalWidth }}>
          <PagesCollectionTimelineHeader
            pixelsPerDay={pixelsPerDay}
            scale={scale}
            ticks={ticks}
            totalWidth={totalWidth}
          />
          {entries.length === 0 ? (
            <p className="px-3 py-8 text-center text-muted-foreground text-sm">{t('timelineEmptyWindow')}</p>
          ) : (
            <PagesCollectionTimelineRows
              canEdit={canEdit}
              dragging={dragging}
              entries={entries}
              moving={moving}
              pixelsPerDay={pixelsPerDay}
              range={range}
              todayOffset={readPageTimelineOffset(timeline.today, range, pixelsPerDay)}
              totalWidth={totalWidth}
            />
          )}
        </div>
      </section>
      <PagesCollectionTimelineUndated rows={undatedRows} total={undated} />
    </div>
  );
};
