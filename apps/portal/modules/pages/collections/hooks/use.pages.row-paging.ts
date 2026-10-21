'use client';

import { useTranslations } from 'next-intl';
import { useContext, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT } from '../constants/pages.lookups.context.constants';
import { readRowQueryKey } from '../lib/pages.row-query.lib';
import { loadMorePageRowsAction, refreshPageRowsAction } from '../server/actions/pages.collections.actions';
import type { PageRowsContinuation } from '../types/pages.query.types';
import type {
  PagesRowPaging,
  PagesRowPagingInput,
  PagesRowPagingState,
  ScopeAddress,
} from '../types/pages.row-paging.types';
import { usePagesRowQuery } from './use.pages.row-query';

/**
 * The rows after the ones the server drew, one page at a time, from the cursor the last page ended on. When the
 * server draws the scope again (after a change) the rows already loaded stay, so a reader deep in a long list is not
 * thrown back to the top; the window is read again in the background and replaces them when it arrives. Rows the
 * server now draws itself are not repeated. Other words searched make those rows another answer, so they are dropped.
 */
export const usePagesRowPaging = ({
  drawnRowIds,
  firstCursor,
  group,
  pageId,
  spaceId,
  viewId,
}: PagesRowPagingInput): PagesRowPaging => {
  const t = useTranslations('pages.collection');
  const addLookups = useContext(PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT);
  const rowQuery = usePagesRowQuery();
  const { quickFilter, search } = rowQuery;
  const queryKey = readRowQueryKey(rowQuery);
  const [state, setState] = useState<PagesRowPagingState>({
    cursor: firstCursor,
    firstCursor,
    loaded: [],
    queryKey,
    refreshFrom: null,
  });
  const [isLoading, startLoading] = useTransition();
  const [, startRefreshing] = useTransition();

  if (state.queryKey !== queryKey) {
    setState({ cursor: firstCursor, firstCursor, loaded: [], queryKey, refreshFrom: null });
  } else if (state.firstCursor !== firstCursor) {
    const isWindowKept = state.loaded.length > 0 && firstCursor !== null;
    setState(
      isWindowKept
        ? { ...state, firstCursor, refreshFrom: firstCursor }
        : { cursor: firstCursor, firstCursor, loaded: [], queryKey, refreshFrom: null },
    );
  }

  const groupKey = group?.key;
  const groupSubKey = group?.subKey;
  const buildScope = (): ScopeAddress => ({
    ...(groupKey === undefined
      ? {}
      : { group: { key: groupKey, ...(groupSubKey === undefined ? {} : { subKey: groupSubKey }) } }),
    pageId,
    quickFilter,
    search,
    spaceId,
    viewId,
  });

  const { loaded: loadedRows, refreshFrom } = state;
  const claimedRefresh = useRef<null | string>(null);
  useEffect(() => {
    if (refreshFrom === null || claimedRefresh.current === refreshFrom) return;
    claimedRefresh.current = refreshFrom;
    startRefreshing(async () => {
      const refreshed = await refreshPageRowsAction({
        ...buildScope(),
        cursor: refreshFrom,
        wanted: loadedRows.length,
      });
      claimedRefresh.current = null;
      if (!isActionSuccess<PageRowsContinuation>(refreshed)) {
        toast.error(t('loadMoreError'));
        setState((current) => (current.refreshFrom === refreshFrom ? { ...current, refreshFrom: null } : current));
        return;
      }
      addLookups({ attachedFiles: refreshed.data.attachedFiles, relatedRows: refreshed.data.relatedRows });
      setState((current) =>
        current.refreshFrom === refreshFrom
          ? { ...current, cursor: refreshed.data.nextCursor, loaded: refreshed.data.rows, refreshFrom: null }
          : current,
      );
    });
  });

  const loadMore = (): void => {
    if (state.cursor === null || isLoading) return;
    const cursor = state.cursor;
    startLoading(async () => {
      const more = await loadMorePageRowsAction({ ...buildScope(), cursor });
      if (!isActionSuccess<PageRowsContinuation>(more)) {
        toast.error(t('loadMoreError'));
        return;
      }
      addLookups({ attachedFiles: more.data.attachedFiles, relatedRows: more.data.relatedRows });
      setState((current) => ({
        ...current,
        cursor: more.data.nextCursor,
        loaded: [
          ...current.loaded,
          ...more.data.rows.filter((row) => !current.loaded.some((held) => held.id === row.id)),
        ],
      }));
    });
  };

  const drawn = new Set(drawnRowIds);
  return {
    hasMore: state.cursor !== null,
    isLoading,
    loadMore,
    rows: state.loaded.filter((row) => !drawn.has(row.id)),
  };
};
