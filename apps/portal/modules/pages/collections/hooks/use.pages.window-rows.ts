'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useContext, useEffect, useRef, useState } from 'react';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { PAGE_COLLECTION_LIVE_COALESCE_MS } from '../constants/pages.collection-live.constants';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT } from '../constants/pages.lookups.context.constants';
import { createChangesController } from '../lib/pages.collection-changes.lib';
import { andQuickFilters } from '../lib/pages.view-query.lib';
import { placeChangedWindowRows } from '../lib/pages.window-placement.lib';
import {
  readPageCollectionChangesAction,
  readPageUndatedCountAction,
} from '../server/actions/pages.collections.actions';
import type { PageCollectionChanges } from '../types/pages.query.types';
import type { WindowRequeryReason } from '../types/pages.window-placement.types';
import type { PagesWindowRows, PagesWindowRowsInput } from '../types/pages.window-rows.types';
import { usePagesCollectionFollowing } from './use.pages.collection-following';
import { usePagesRowQuery } from './use.pages.row-query';

/**
 * The rows of a calendar or a timeline, kept in step with what others change. The server reads the rows of the days on
 * screen once; from then on a row that changed comes in, goes out or is replaced here, by the filters the server read
 * them with. What the browser cannot tell, it says why and the page is drawn again (ADR 026, ADR 029).
 */
export const usePagesWindowRows = (input: PagesWindowRowsInput): PagesWindowRows => {
  const {
    changesCursor,
    dateProperty,
    pageId,
    rows: drawnRows,
    spaceId,
    undated: drawnUndated,
    undatedRows: drawnUndatedRows,
    view,
  } = input;
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);
  const addLookups = useContext(PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT);
  const { quickFilter, search } = usePagesRowQuery();
  const [held, setHeld] = useState<PagesWindowRows>({
    rows: drawnRows,
    undated: drawnUndated,
    undatedRows: drawnUndatedRows,
  });
  const [drawnFrom, setDrawnFrom] = useState(drawnRows);
  if (drawnFrom !== drawnRows) {
    setDrawnFrom(drawnRows);
    setHeld({ rows: drawnRows, undated: drawnUndated, undatedRows: drawnUndatedRows });
  }
  const latest = useRef({ ...input, addLookups, held, quickFilter, search });
  useEffect(() => {
    latest.current = { ...input, addLookups, held, quickFilter, search };
  });

  const createController = () => {
    const recount = async (): Promise<void> => {
      const current = latest.current;
      if (current.dateProperty === null) return;
      const result = await callAction(() =>
        readPageUndatedCountAction({
          dateProperty: current.dateProperty ?? '',
          pageId,
          quickFilter: current.quickFilter,
          search: current.search,
          spaceId,
          viewId: current.view.id,
        }),
      );
      if (!isActionSuccess<null | number>(result) || result.data === null) return;
      const count = result.data;
      setHeld((state) => ({ ...state, undated: count }));
    };

    return createChangesController<WindowRequeryReason>({
      apply: async (batch) => {
        const current = latest.current;
        const configuration = readPageViewConfiguration(current.view.configuration);
        const placement = placeChangedWindowRows({
          changedRows: batch.rows,
          context: {
            filter:
              current.quickFilter === null
                ? configuration.filter
                : andQuickFilters(configuration.filter, current.quickFilter),
            hasSearch: current.search !== '',
            isTruncated: current.isTruncated,
            now: Date.now(),
            properties: current.properties,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            undatedFilter:
              current.listsUndated && current.dateProperty !== null
                ? { kind: 'CONDITION', operator: 'IS_EMPTY', propertyKey: current.dateProperty, value: null }
                : null,
            undatedTotal: current.held.undated,
            viewerId: current.viewerId,
            windowFilters: current.windowFilters,
          },
          rows: current.held.rows,
          trashedIds: batch.trashedIds,
          undatedRows: current.held.undatedRows,
        });
        if (placement.kind === 'requery') return placement.reason;
        latest.current = {
          ...current,
          held: { ...current.held, rows: placement.rows, undatedRows: placement.undatedRows },
        };
        setHeld((state) => ({ ...state, rows: placement.rows, undatedRows: placement.undatedRows }));
        if (placement.hasChanged) void recount();
        return null;
      },
      coalesceMs: PAGE_COLLECTION_LIVE_COALESCE_MS,
      initialCursor: latest.current.changesCursor ?? '',
      onLookups: (changes) =>
        latest.current.addLookups({ attachedFiles: changes.attachedFiles, relatedRows: changes.relatedRows }),
      readChanges: async (cursor) => {
        const result = await callAction(() => readPageCollectionChangesAction({ cursor, pageId, spaceId }));
        return isActionSuccess<PageCollectionChanges>(result) ? result.data : null;
      },
      requestRefresh: (reason) => notices.requestRefresh(reason),
    });
  };

  usePagesCollectionFollowing({
    changesCursor: dateProperty === null ? null : changesCursor,
    createController,
    enabled: true,
    pageId,
    spaceId,
    view,
  });

  return held;
};
