import 'server-only';

import type { PageFilter } from '@neuma/shared';
import { PAGE_VIEW_TYPE, readPageViewConfiguration } from '@neuma/shared';
import { PAGE_VIEW_CALENDAR_MAXIMUM_ROWS } from '../../constants/pages.query.constants';
import { readCalendarGridRange, resolveCalendarMonth } from '../../lib/pages.calendar.lib';
import { toViewAggregates } from '../../lib/pages.query-aggregates.lib';
import { toViewOutcome } from '../../lib/pages.query-outcome.lib';
import { buildViewCountsQuery, buildViewRowsQuery } from '../../lib/pages.view-query.lib';
import type {
  PageRow,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewReading,
} from '../../types/pages.schema.types';
import { queryPageView } from '../queries/pages.schema.queries';
import { readCalendarWindow } from './pages.rows-reading.server';

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

/**
 * A calendar opens on a month and draws every row that starts in its grid. The first rows of the view only say which
 * month that is (the one of the first dated row, else today's); the grid itself is read with a date range.
 */
const readCalendarReading = async (
  spaceId: string,
  pageId: string,
  view: PageSchemaView,
  search: string,
  quickFilter: null | PageFilter,
  requestedMonth: null | string,
  firstRows: readonly PageRow[],
): Promise<Pick<PageViewReading, 'attachedFiles' | 'outcome' | 'relatedRows'> | null> => {
  const dateProperty = readPageViewConfiguration(view.configuration).dateProperty;
  if (dateProperty === null) return null;
  const month = resolveCalendarMonth(requestedMonth, firstRows, dateProperty, new Date().toISOString());
  const window = await readCalendarWindow({
    dateProperty,
    maximumRows: PAGE_VIEW_CALENDAR_MAXIMUM_ROWS,
    pageId,
    quickFilter,
    range: readCalendarGridRange(month),
    search,
    spaceId,
    viewId: view.id,
  });
  if (window === null) return null;
  return {
    attachedFiles: window.attachedFiles,
    outcome: {
      calendar: { isTruncated: window.isTruncated, month, undated: window.undated },
      kind: 'FLAT_ROWS',
      rows: window.rows,
    },
    relatedRows: window.relatedRows,
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
  search = '',
  requestedMonth: null | string = null,
  quickFilter: null | PageFilter = null,
): Promise<PageViewReading | null> => {
  const aggregates = readAggregates(spaceId, pageId, view, search, quickFilter);
  if (view.type === PAGE_VIEW_TYPE.CHART) {
    return { aggregates, attachedFiles: [], outcome: { groups: [], kind: 'GROUPED_ROWS' }, relatedRows: [] };
  }
  const readResult = await queryPageView(spaceId, pageId, buildViewRowsQuery(view, search, quickFilter));
  const read = readResult.isOk() ? readResult.getValue() : null;
  if (read === null) return null;
  const outcome = toViewOutcome(read, view, properties, statusGroupLabel);
  const calendar =
    view.type === PAGE_VIEW_TYPE.CALENDAR && outcome.kind === 'FLAT_ROWS'
      ? await readCalendarReading(spaceId, pageId, view, search, quickFilter, requestedMonth, outcome.rows)
      : null;
  return {
    aggregates,
    attachedFiles: calendar?.attachedFiles ?? read.attachedFiles,
    outcome: calendar?.outcome ?? outcome,
    relatedRows: calendar?.relatedRows ?? read.relatedRows,
  };
};
