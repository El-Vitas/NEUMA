import 'server-only';

import type { PageFilter, PageQueryReducer } from '@neuma/shared';
import {
  PAGE_VIEW_CONTINUATION_ROWS,
  PAGE_VIEW_COUNT_ITEM,
  PAGE_VIEW_COUNTS_REDUCER,
  PAGE_VIEW_ROWS_REDUCER,
} from '../../constants/pages.query.constants';
import { buildCalendarRangeFilter, buildCalendarUndatedFilter } from '../../lib/pages.calendar.lib';
import { collectRowPages } from '../../lib/pages.rows-collecting.lib';
import { toSearchPart } from '../../lib/pages.view-query.lib';
import type { PageQueryResult } from '../../types/pages.query.types';
import type {
  CalendarWindowInput,
  CalendarWindowRead,
  ReadRowsInput,
  ScopeRowsRead,
} from '../../types/pages.rows-reading.types';
import type { PageAttachedFile, PageRelatedRow, PageRow } from '../../types/pages.schema.types';
import { queryPageView } from '../queries/pages.schema.queries';

const reducerOf = (input: ReadRowsInput, cursor: string | undefined, remaining: number): PageQueryReducer => {
  const continuation = {
    ...(cursor === undefined ? {} : { cursor }),
    id: PAGE_VIEW_ROWS_REDUCER,
    limit: Math.min(PAGE_VIEW_CONTINUATION_ROWS, remaining),
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
        ...(input.quickFilter === undefined ? {} : { quickFilter: input.quickFilter }),
        reducers: [reducerOf(input, cursor, remaining)],
        ...toSearchPart(input.search),
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
    quickFilter,
    reducers: [
      {
        by: 'NONE',
        id: PAGE_VIEW_COUNTS_REDUCER,
        items: [{ calculation: 'COUNT_ALL', id: PAGE_VIEW_COUNT_ITEM, propertyKey: null }],
        kind: 'aggregations',
      },
    ],
    ...toSearchPart(input.search),
    viewId: input.viewId,
  });
  const outcome = read.isOk() ? read.getValue()?.reducers[PAGE_VIEW_COUNTS_REDUCER] : undefined;
  return outcome?.kind === 'aggregations' ? outcome.distinctRowCount : null;
};

/** Every row that starts on a day of the grid, up to a limit, and how many rows have no date at all. */
export const readCalendarWindow = async (input: CalendarWindowInput): Promise<CalendarWindowRead | null> => {
  const [read, undated] = await Promise.all([
    readRowsInScope({
      pageId: input.pageId,
      quickFilter: buildCalendarRangeFilter(input.dateProperty, input.range),
      search: input.search,
      spaceId: input.spaceId,
      viewId: input.viewId,
      wanted: input.maximumRows,
    }),
    countRows(input, buildCalendarUndatedFilter(input.dateProperty)),
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
