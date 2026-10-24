'use client';

import { useTranslations } from 'next-intl';
import { useContext, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT } from '../constants/pages.lookups.context.constants';
import { PAGE_VIEW_FLAT_GROUP_KEY } from '../constants/pages.query.constants';
import { listColumnsToRefresh, mergeLoadedCards } from '../lib/pages.board-paging.lib';
import { readRowQueryKey } from '../lib/pages.row-query.lib';
import { loadMorePageRowsAction, refreshPageRowsAction } from '../server/actions/pages.collections.actions';
import type {
  ColumnToRefresh,
  PagesBoardLoaded,
  PagesBoardPaging,
  PagesBoardPagingInput,
} from '../types/pages.board-paging.types';
import type { PageRowsContinuation } from '../types/pages.query.types';
import { usePagesRowQuery } from './use.pages.row-query';

const cellKey = (bandKey: string, groupKey: string): string => `${bandKey}|${groupKey}`;

/** A view that does not group asks for its rows as a whole, with no group to name. */
const addressOf = (bandKey: string, groupKey: string) =>
  groupKey === PAGE_VIEW_FLAT_GROUP_KEY
    ? {}
    : { group: { key: groupKey, ...(bandKey === '' ? {} : { subKey: bandKey }) } };

/**
 * Each column asks for its own next cards, from the cursor its last page ended on. What a column loaded is kept when
 * the server draws that column again (a card moved in or out), so a reader deep in a long column is not thrown back:
 * the window is read again in the background and replaces what was loaded when it arrives. Other words searched make
 * the loaded cards another answer, so they are dropped.
 */
export const usePagesBoardPaging = ({ bands, pageId, spaceId, viewId }: PagesBoardPagingInput): PagesBoardPaging => {
  const t = useTranslations('pages.collection');
  const addLookups = useContext(PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT);
  const rowQuery = usePagesRowQuery();
  const { quickFilter, search } = rowQuery;
  const queryKey = readRowQueryKey(rowQuery);
  const [loaded, setLoaded] = useState<Readonly<Record<string, PagesBoardLoaded>>>({});
  const [loadedBy, setLoadedBy] = useState(queryKey);
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  const [, startLoading] = useTransition();
  const [, startRefreshing] = useTransition();
  const claimed = useRef<ReadonlySet<string>>(new Set());

  if (loadedBy !== queryKey) {
    setLoadedBy(queryKey);
    setLoaded({});
  }

  const merged = mergeLoadedCards(bands, loaded, cellKey);
  const stale = listColumnsToRefresh(bands, loaded, cellKey);

  const finish = (key: string): void =>
    setLoading((current) => new Set([...current].filter((candidate) => candidate !== key)));

  const refresh = (column: ColumnToRefresh): void => {
    const key = cellKey(column.bandKey, column.groupKey);
    claimed.current = new Set(claimed.current).add(key);
    setLoaded((current) => {
      const held = current[key];
      return held === undefined ? current : { ...current, [key]: { ...held, refreshFrom: column.drawnCursor } };
    });
    startRefreshing(async () => {
      const wanted = loaded[key]?.rows.length ?? 1;
      const refreshed = await callAction(() =>
        refreshPageRowsAction({
          ...addressOf(column.bandKey, column.groupKey),
          cursor: column.drawnCursor,
          pageId,
          quickFilter,
          search,
          spaceId,
          viewId,
          wanted,
        }),
      );
      claimed.current = new Set([...claimed.current].filter((candidate) => candidate !== key));
      if (!isActionSuccess<PageRowsContinuation>(refreshed)) {
        toast.error(t('loadMoreError'));
        setLoaded((current) => {
          const held = current[key];
          return held === undefined ? current : { ...current, [key]: { ...held, refreshFrom: null } };
        });
        return;
      }
      addLookups({ attachedFiles: refreshed.data.attachedFiles, relatedRows: refreshed.data.relatedRows });
      setLoaded((current) => ({
        ...current,
        [key]: {
          cursor: refreshed.data.nextCursor,
          drawnCursor: column.drawnCursor,
          refreshFrom: null,
          rows: refreshed.data.rows,
        },
      }));
    });
  };

  useEffect(() => {
    for (const column of stale) {
      if (!claimed.current.has(cellKey(column.bandKey, column.groupKey))) refresh(column);
    }
  });

  const loadMore = (bandKey: string, groupKey: string): void => {
    const key = cellKey(bandKey, groupKey);
    const group = merged.find((band) => band.key === bandKey)?.groups.find((candidate) => candidate.key === groupKey);
    const drawn = bands.find((band) => band.key === bandKey)?.groups.find((candidate) => candidate.key === groupKey);
    const cursor = group?.nextCursor ?? null;
    if (drawn === undefined || cursor === null || loading.has(key)) return;
    setLoading((current) => new Set(current).add(key));
    startLoading(async () => {
      const more = await callAction(() =>
        loadMorePageRowsAction({
          cursor,
          ...addressOf(bandKey, groupKey),
          pageId,
          quickFilter,
          search,
          spaceId,
          viewId,
        }),
      );
      finish(key);
      if (!isActionSuccess<PageRowsContinuation>(more)) {
        toast.error(t('loadMoreError'));
        return;
      }
      addLookups({ attachedFiles: more.data.attachedFiles, relatedRows: more.data.relatedRows });
      setLoaded((current) => ({
        ...current,
        [key]: {
          cursor: more.data.nextCursor,
          drawnCursor: drawn.nextCursor ?? null,
          refreshFrom: null,
          rows: [...(current[key]?.rows ?? []), ...more.data.rows],
        },
      }));
    });
  };

  const resetLoaded = (): void => {
    claimed.current = new Set();
    setLoaded({});
  };

  return {
    bands: merged,
    isLoading: (bandKey, groupKey) => loading.has(cellKey(bandKey, groupKey)),
    loadMore,
    resetLoaded,
  };
};
