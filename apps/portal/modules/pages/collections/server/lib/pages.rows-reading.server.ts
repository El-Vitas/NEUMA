import 'server-only';

import type { PageFilter, PageQueryReducer } from '@neuma/shared';
import {
  PAGE_VIEW_CLIENT_MODE_PAGE_ROWS,
  PAGE_VIEW_CONTINUATION_ROWS,
  PAGE_VIEW_COUNT_ITEM,
  PAGE_VIEW_COUNTS_REDUCER,
  PAGE_VIEW_ROWS_REDUCER,
} from '../../constants/pages.query.constants';
import { buildCalendarRangeFilter, buildCalendarUndatedFilter } from '../../lib/pages.calendar.lib';
import { collectRowPages } from '../../lib/pages.rows-collecting.lib';
import { buildTimelineWindowFilters } from '../../lib/pages.timeline.lib';
import { andQuickFilters, toRefinementPart } from '../../lib/pages.view-query.lib';
import type { PageQueryResult } from '../../types/pages.query.types';
import type {
  CalendarWindowInput,
  CalendarWindowRead,
  ReadRowsInput,
  ScopeRowsRead,
  TimelineWindowInput,
  TimelineWindowRead,
} from '../../types/pages.rows-reading.types';
import type { PageAttachedFile, PageRelatedRow, PageRow } from '../../types/pages.schema.types';
import { queryPageView } from '../queries/pages.schema.queries';

/** The whole view may be read a thousand rows at a time; the rows of one group are capped at a hundred. */
const pageSizeOf = (input: ReadRowsInput): number =>
  input.group === undefined ? PAGE_VIEW_CLIENT_MODE_PAGE_ROWS : PAGE_VIEW_CONTINUATION_ROWS;

const reducerOf = (input: ReadRowsInput, cursor: string | undefined, remaining: number): PageQueryReducer => {
  const continuation = {
    ...(cursor === undefined ? {} : { cursor }),
    id: PAGE_VIEW_ROWS_REDUCER,
    limit: Math.min(pageSizeOf(input), remaining),
  };
  return input.group === undefined
    ? { ...continuation, kind: 'results' }
    : { ...continuation, group: input.group, kind: 'groupResults' };
};

const readRowsOf = (result: PageQueryResult): { nextCursor: null | string; rows: readonly PageRow[] } | null => {
  const outcome = result.reducers[PAGE_VIEW_ROWS_REDUCER];
  if (outcome?.kind !== 'results') return null;
  return { nextCursor: outcome.nextCursor, rows: outcome.ids.flatMap((id) => result.rows[id] ?? []) };
};

/**
 * Reads rows page after page from where a scope (the view, or one of its groups) stands, until `wanted` rows are in
 * hand. Null when a page cannot be read.
 */
export const readRowsInScope = async (input: ReadRowsInput): Promise<ScopeRowsRead | null> => {
  const attachedFiles = new Map<string, PageAttachedFile>();
  const relatedRows = new Map<string, PageRelatedRow>();
  const collected = await collectRowPages({
    readPage: async (cursor, remaining) => {
      const read = await queryPageView(input.spaceId, input.pageId, {
        reducers: [reducerOf(input, cursor, remaining)],
        ...toRefinementPart(input.search, input.quickFilter),
        viewId: input.viewId,
      });
      const result = read.isOk() ? read.getValue() : null;
      if (result === null) return null;
      for (const file of result.attachedFiles) attachedFiles.set(file.id, file);
      for (const related of result.relatedRows) relatedRows.set(related.id, related);
      return readRowsOf(result);
    },
    startCursor: input.startCursor,
    wanted: input.wanted,
  });
  if (collected === null) return null;
  return {
    attachedFiles: [...attachedFiles.values()],
    nextCursor: collected.nextCursor,
    relatedRows: [...relatedRows.values()],
    rows: collected.rows,
  };
};

const countRows = async (
  input: Pick<CalendarWindowInput, 'pageId' | 'search' | 'spaceId' | 'viewId'>,
  quickFilter: PageFilter,
): Promise<number | null> => {
  const read = await queryPageView(input.spaceId, input.pageId, {
    reducers: [
      {
        by: 'NONE',
        id: PAGE_VIEW_COUNTS_REDUCER,
        items: [{ calculation: 'COUNT_ALL', id: PAGE_VIEW_COUNT_ITEM, propertyKey: null }],
        kind: 'aggregations',
      },
    ],
    ...toRefinementPart(input.search, quickFilter),
    viewId: input.viewId,
  });
  const outcome = read.isOk() ? read.getValue()?.reducers[PAGE_VIEW_COUNTS_REDUCER] : undefined;
  return outcome?.kind === 'aggregations' ? outcome.distinctRowCount : null;
};

/** How many rows have no date in the property, among those the view and the words searched let through. */
export const countRowsWithoutDate = async (
  input: Pick<CalendarWindowInput, 'dateProperty' | 'pageId' | 'quickFilter' | 'search' | 'spaceId' | 'viewId'>,
): Promise<number | null> =>
  countRows(input, andQuickFilters(input.quickFilter, buildCalendarUndatedFilter(input.dateProperty)));

const mergeById = <TItem extends { readonly id: string }>(lists: readonly (readonly TItem[])[]): readonly TItem[] => [
  ...new Map(lists.flat().map((item) => [item.id, item])).values(),
];

/**
 * Every row that lasts into the window, up to a limit, and the first rows that have no start with how many there are.
 * With the end in another property the window is read with more than one question; the answers are joined.
 */
export const readTimelineWindow = async (input: TimelineWindowInput): Promise<TimelineWindowRead | null> => {
  const undatedFilter = andQuickFilters(input.quickFilter, buildCalendarUndatedFilter(input.startProperty));
  const [reads, undatedRead, undated] = await Promise.all([
    Promise.all(
      buildTimelineWindowFilters(input.startProperty, input.endProperty, input.window).map((filter) =>
        readRowsInScope({
          pageId: input.pageId,
          quickFilter: andQuickFilters(input.quickFilter, filter),
          search: input.search,
          spaceId: input.spaceId,
          viewId: input.viewId,
          wanted: input.maximumRows,
        }),
      ),
    ),
    readRowsInScope({
      pageId: input.pageId,
      quickFilter: undatedFilter,
      search: input.search,
      spaceId: input.spaceId,
      viewId: input.viewId,
      wanted: input.undatedRows,
    }),
    countRows(input, undatedFilter),
  ]);
  const complete = reads.flatMap((read) => (read === null ? [] : [read]));
  if (complete.length !== reads.length || undatedRead === null || undated === null) return null;
  const rows = mergeById(complete.map((read) => read.rows));
  return {
    attachedFiles: mergeById([...complete.map((read) => read.attachedFiles), undatedRead.attachedFiles]),
    isTruncated: complete.some((read) => read.nextCursor !== null) || rows.length > input.maximumRows,
    relatedRows: mergeById([...complete.map((read) => read.relatedRows), undatedRead.relatedRows]),
    rows: rows.slice(0, input.maximumRows),
    undated,
    undatedRows: undatedRead.rows,
  };
};

/** Every row that starts on a day of the grid, up to a limit, and how many rows have no date at all. */
export const readCalendarWindow = async (input: CalendarWindowInput): Promise<CalendarWindowRead | null> => {
  const [read, undated] = await Promise.all([
    readRowsInScope({
      pageId: input.pageId,
      quickFilter: andQuickFilters(input.quickFilter, buildCalendarRangeFilter(input.dateProperty, input.range)),
      search: input.search,
      spaceId: input.spaceId,
      viewId: input.viewId,
      wanted: input.maximumRows,
    }),
    countRows(input, andQuickFilters(input.quickFilter, buildCalendarUndatedFilter(input.dateProperty))),
  ]);
  if (read === null || undated === null) return null;
  return {
    attachedFiles: read.attachedFiles,
    isTruncated: read.nextCursor !== null,
    relatedRows: read.relatedRows,
    rows: read.rows,
    undated,
  };
};
