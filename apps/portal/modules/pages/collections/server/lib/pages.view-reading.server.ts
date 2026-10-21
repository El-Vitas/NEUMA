import 'server-only';

import type { PageFilter } from '@neuma/shared';
import {
  PAGE_DATE_SCALE,
  PAGE_VIEW_TYPE,
  readPageLocalDay,
  readPageTimelineWindow,
  readPageViewConfiguration,
} from '@neuma/shared';
import { readRequestTimeZone } from '@/shared/server/lib/time-zone.server';
import {
  PAGE_VIEW_CALENDAR_MAXIMUM_ROWS,
  PAGE_VIEW_TIMELINE_MAXIMUM_ROWS,
  PAGE_VIEW_TIMELINE_UNDATED_ROWS,
} from '../../constants/pages.query.constants';
import { readCalendarGridRange, readCalendarWeekRange, resolveCalendarMonth } from '../../lib/pages.calendar.lib';
import { toViewAggregates } from '../../lib/pages.query-aggregates.lib';
import { toViewOutcome } from '../../lib/pages.query-outcome.lib';
import { resolveTimelineDay } from '../../lib/pages.timeline.lib';
import { buildViewCountsQuery, buildViewRowsQuery } from '../../lib/pages.view-query.lib';
import type { CollectionRowsRequest } from '../../types/pages.collections.types';
import type { ViewRowsReading } from '../../types/pages.rows-reading.types';
import type {
  PageRow,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewReading,
} from '../../types/pages.schema.types';
import { queryPageView } from '../queries/pages.schema.queries';
import { readCalendarWindow, readTimelineWindow } from './pages.rows-reading.server';

const readAggregates = async (
  spaceId: string,
  pageId: string,
  view: PageSchemaView,
  search: string,
  quickFilter: null | PageFilter,
): Promise<PageViewAggregates | null> => {
  const counted = await queryPageView(spaceId, pageId, buildViewCountsQuery(view, search, quickFilter));
  return toViewAggregates(counted.isOk() ? counted.getValue() : null);
};

const readToday = async (): Promise<string> => readPageLocalDay(Date.now(), (await readRequestTimeZone()) ?? 'UTC');

/**
 * A calendar opens on a month or on a week and draws every row whose dates reach into its grid. The first rows of the
 * view only say which month that is when none was asked for (the one of the first dated row, else today's); the grid
 * itself is read with a date range.
 */
const readCalendarReading = async (
  spaceId: string,
  pageId: string,
  view: PageSchemaView,
  request: CollectionRowsRequest,
  firstRows: readonly PageRow[],
): Promise<ViewRowsReading | null> => {
  const configuration = readPageViewConfiguration(view.configuration);
  const { dateProperty } = configuration;
  if (dateProperty === null) return null;
  const today = await readToday();
  const isWeek = configuration.dateScale === PAGE_DATE_SCALE.WEEK;
  const day = resolveTimelineDay(request.day, today);
  const month = resolveCalendarMonth(request.month, firstRows, dateProperty, today);
  const window = await readCalendarWindow({
    dateProperty,
    maximumRows: PAGE_VIEW_CALENDAR_MAXIMUM_ROWS,
    pageId,
    quickFilter: request.quickFilter,
    range: isWeek ? readCalendarWeekRange(day) : readCalendarGridRange(month),
    search: request.search,
    spaceId,
    viewId: view.id,
  });
  if (window === null) return null;
  return {
    attachedFiles: window.attachedFiles,
    outcome: {
      calendar: {
        day,
        isTruncated: window.isTruncated,
        month: isWeek ? day.slice(0, 'YYYY-MM'.length) : month,
        scale: isWeek ? PAGE_DATE_SCALE.WEEK : PAGE_DATE_SCALE.MONTH,
        undated: window.undated,
      },
      kind: 'FLAT_ROWS',
      rows: window.rows,
    },
    relatedRows: window.relatedRows,
  };
};

/**
 * A timeline opens on a window of days around a day and draws every row that lasts into it. It needs no first read of
 * the view: the window is the question. A view that does not say yet which date places its rows reads nothing.
 */
const readTimelineReading = async (
  spaceId: string,
  pageId: string,
  view: PageSchemaView,
  request: CollectionRowsRequest,
): Promise<ViewRowsReading | null> => {
  const configuration = readPageViewConfiguration(view.configuration);
  const { dateProperty } = configuration;
  if (dateProperty === null) {
    return { attachedFiles: [], outcome: { kind: 'FLAT_ROWS', rows: [] }, relatedRows: [] };
  }
  const today = await readToday();
  const anchor = resolveTimelineDay(request.day, today);
  const window = readPageTimelineWindow(configuration.dateScale, anchor);
  const read = await readTimelineWindow({
    endProperty: configuration.endDateProperty,
    maximumRows: PAGE_VIEW_TIMELINE_MAXIMUM_ROWS,
    pageId,
    quickFilter: request.quickFilter,
    search: request.search,
    spaceId,
    startProperty: dateProperty,
    undatedRows: PAGE_VIEW_TIMELINE_UNDATED_ROWS,
    viewId: view.id,
    window,
  });
  if (read === null) return null;
  return {
    attachedFiles: read.attachedFiles,
    outcome: {
      kind: 'FLAT_ROWS',
      rows: read.rows,
      timeline: {
        anchor,
        isTruncated: read.isTruncated,
        scale: configuration.dateScale,
        today,
        undated: read.undated,
        undatedRows: read.undatedRows,
        window,
      },
    },
    relatedRows: read.relatedRows,
  };
};

/**
 * Reads a view in the two phases of ADR 025. The rows are awaited, so the screen can be drawn with them. The counts
 * start now but are not awaited: they travel as a promise the screen reads under a Suspense, with a "calculating"
 * until the database is done.
 */
export const readPageViewReading = async (
  spaceId: string,
  pageId: string,
  view: PageSchemaView,
  properties: readonly PageSchemaProperty[],
  statusGroupLabel: (group: string) => string,
  request: CollectionRowsRequest,
): Promise<PageViewReading | null> => {
  const aggregates = readAggregates(spaceId, pageId, view, request.search, request.quickFilter);
  if (view.type === PAGE_VIEW_TYPE.CHART) {
    return {
      aggregates,
      attachedFiles: [],
      changesCursor: null,
      outcome: { groups: [], kind: 'GROUPED_ROWS' },
      relatedRows: [],
    };
  }
  if (view.type === PAGE_VIEW_TYPE.TIMELINE) {
    const timeline = await readTimelineReading(spaceId, pageId, view, request);
    return timeline === null ? null : { aggregates, changesCursor: null, ...timeline };
  }
  const readResult = await queryPageView(
    spaceId,
    pageId,
    buildViewRowsQuery(view, request.search, request.quickFilter),
  );
  const read = readResult.isOk() ? readResult.getValue() : null;
  if (read === null) return null;
  const outcome = toViewOutcome(read, view, properties, statusGroupLabel);
  const calendar =
    view.type === PAGE_VIEW_TYPE.CALENDAR && outcome.kind === 'FLAT_ROWS'
      ? await readCalendarReading(spaceId, pageId, view, request, outcome.rows)
      : null;
  return {
    aggregates,
    attachedFiles: calendar?.attachedFiles ?? read.attachedFiles,
    changesCursor: calendar === null ? read.changesCursor : null,
    outcome: calendar?.outcome ?? outcome,
    relatedRows: calendar?.relatedRows ?? read.relatedRows,
  };
};
