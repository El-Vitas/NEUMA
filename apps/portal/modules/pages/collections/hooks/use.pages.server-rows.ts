'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useContext, useEffect, useRef, useState } from 'react';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { PAGE_COLLECTION_LIVE_COALESCE_MS } from '../constants/pages.collection-live.constants';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT } from '../constants/pages.lookups.context.constants';
import { PAGE_VIEW_FLAT_GROUP_KEY, PAGE_VIEW_REFRESH_MAXIMUM_ROWS } from '../constants/pages.query.constants';
import { createBoardLiveController } from '../lib/pages.board-live.lib';
import { andQuickFilters } from '../lib/pages.view-query.lib';
import {
  readPageCollectionChangesAction,
  readPageViewAggregatesAction,
  refreshPageRowsAction,
} from '../server/actions/pages.collections.actions';
import type { BoardColumnRead } from '../types/pages.board-live.types';
import type { BoardColumnAddress, BoardPlacementContext } from '../types/pages.board-placement.types';
import type { PageCollectionChanges, PageRowsContinuation } from '../types/pages.query.types';
import type { PageViewAggregates } from '../types/pages.schema.types';
import type { PagesViewLive, PagesViewLiveInput } from '../types/pages.view-live.types';
import { usePagesBoardPaging } from './use.pages.board-paging';
import { usePagesCollectionFollowing } from './use.pages.collection-following';
import { usePagesRowQuery } from './use.pages.row-query';

/**
 * The bands of a view, kept in step with what others change. The server draws them once; from then on the rows that
 * others change are placed here with the engine the server is tested against, and only what the browser cannot place
 * sends the page back to the server (ADR 026, ADR 029).
 */
export const usePagesServerRows = (input: PagesViewLiveInput, isEnabled: boolean): Omit<PagesViewLive, 'mode'> => {
  const { aggregates, bands, changesCursor, pageId, spaceId, view } = input;
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);
  const addLookups = useContext(PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT);
  const { quickFilter, search } = usePagesRowQuery();
  const [drawn, setDrawn] = useState(bands);
  const [drawnFrom, setDrawnFrom] = useState(bands);
  if (drawnFrom !== bands) {
    setDrawnFrom(bands);
    setDrawn(bands);
  }
  const [counted, setCounted] = useState<null | Promise<PageViewAggregates | null>>(null);
  const [countedFrom, setCountedFrom] = useState(aggregates);
  if (countedFrom !== aggregates) {
    setCountedFrom(aggregates);
    setCounted(null);
  }
  const paging = usePagesBoardPaging({ bands: drawn, pageId, spaceId, viewId: view.id });
  const latest = useRef({
    ...input,
    addLookups,
    merged: paging.bands,
    quickFilter,
    resetLoaded: paging.resetLoaded,
    search,
  });
  useEffect(() => {
    latest.current = {
      ...input,
      addLookups,
      merged: paging.bands,
      quickFilter,
      resetLoaded: paging.resetLoaded,
      search,
    };
  });

  const createController = () => {
    const readContext = (): BoardPlacementContext => {
      const current = latest.current;
      const configuration = readPageViewConfiguration(current.view.configuration);
      return {
        filter:
          current.quickFilter === null
            ? configuration.filter
            : andQuickFilters(configuration.filter, current.quickFilter),
        groupByKey: current.groupByKey,
        groupByMode: current.groupByMode,
        hasSearch: current.search !== '',
        hiddenGroups: configuration.hiddenGroups,
        now: Date.now(),
        properties: current.properties,
        sorts: configuration.sorts,
        subGroupByKey: current.subGroupByKey,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewerId: current.viewerId,
      };
    };

    const readChanges = async (cursor: string): Promise<null | PageCollectionChanges> => {
      const result = await callAction(() => readPageCollectionChangesAction({ cursor, pageId, spaceId }));
      return isActionSuccess<PageCollectionChanges>(result) ? result.data : null;
    };

    const readColumn = async (address: BoardColumnAddress, wanted: number): Promise<BoardColumnRead | null> => {
      const current = latest.current;
      const result = await callAction(() =>
        refreshPageRowsAction({
          ...(address.groupKey === PAGE_VIEW_FLAT_GROUP_KEY
            ? {}
            : { group: { key: address.groupKey, ...(address.bandKey === '' ? {} : { subKey: address.bandKey }) } }),
          pageId,
          quickFilter: current.quickFilter,
          search: current.search,
          spaceId,
          viewId: current.view.id,
          wanted: Math.min(wanted, PAGE_VIEW_REFRESH_MAXIMUM_ROWS),
        }),
      );
      if (!isActionSuccess<PageRowsContinuation>(result)) return null;
      current.addLookups({ attachedFiles: result.data.attachedFiles, relatedRows: result.data.relatedRows });
      return { nextCursor: result.data.nextCursor, rows: result.data.rows };
    };

    const readCounts = async (): Promise<PageViewAggregates | null> => {
      const current = latest.current;
      const result = await callAction(() =>
        readPageViewAggregatesAction({
          configuration: current.view.configuration,
          pageId,
          quickFilter: current.quickFilter,
          search: current.search,
          spaceId,
          viewId: current.view.id,
          viewType: current.view.type,
        }),
      );
      return isActionSuccess<PageViewAggregates | null>(result) ? result.data : null;
    };

    return createBoardLiveController({
      applyBands: (next) => {
        setDrawn(next);
        latest.current.resetLoaded();
      },
      coalesceMs: PAGE_COLLECTION_LIVE_COALESCE_MS,
      initialCursor: latest.current.changesCursor ?? '',
      onCountChanged: () => setCounted(readCounts()),
      onLookups: (changes) =>
        latest.current.addLookups({ attachedFiles: changes.attachedFiles, relatedRows: changes.relatedRows }),
      readBands: () => latest.current.merged,
      readChanges,
      readColumn,
      readContext,
      requestRefresh: (reason) => notices.requestRefresh(reason),
    });
  };

  usePagesCollectionFollowing({
    changesCursor,
    createController,
    enabled: isEnabled,
    pageId,
    spaceId,
    view,
  });

  return { ...paging, aggregates: counted ?? aggregates };
};
