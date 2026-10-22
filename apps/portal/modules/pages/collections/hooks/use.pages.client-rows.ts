'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { NOT_LOADED_CLIENT_ROWS } from '../constants/pages.client-rows.constants';
import { PAGE_COLLECTION_LIVE_COALESCE_MS } from '../constants/pages.collection-live.constants';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT } from '../constants/pages.lookups.context.constants';
import { PAGE_VIEW_CONTINUATION_ROWS } from '../constants/pages.query.constants';
import { PAGE_ROW_STORE_CONTEXT } from '../constants/pages.view-writes.context.constants';
import { readClientView, toShownKey } from '../lib/pages.client-view.lib';
import { createChangesController } from '../lib/pages.collection-changes.lib';
import { readEveryRow } from '../lib/pages.every-row-reading.lib';
import { namesViewer } from '../lib/pages.filter-keys.lib';
import { createPageRowStore } from '../lib/pages.row-store.lib';
import { readEveryPageRowAction, readPageCollectionChangesAction } from '../server/actions/pages.collections.actions';
import type { PagesClientRows, PagesClientRowsState } from '../types/pages.client-rows.types';
import type { PageCollectionChanges, PageEveryRowRead } from '../types/pages.query.types';
import type { PageSchemaView } from '../types/pages.schema.types';
import type { PagesViewLiveInput } from '../types/pages.view-live.types';
import { usePagesCollectionFollowing } from './use.pages.collection-following';
import { usePagesRowQuery } from './use.pages.row-query';

/** The rows held belong to the view and to the filter it was saved with: another filter is another set of rows. */
const readClientScope = (view: PageSchemaView): string =>
  `${view.id}|${JSON.stringify(readPageViewConfiguration(view.configuration).filter)}`;

const noop = (): void => undefined;

/**
 * A view drawn by the browser itself: it reads every row of the collection once, then filters, sorts, groups and counts
 * them with the engine of the server, and places what others change without asking the server for the view again
 * (ADR 029). Until the rows are held, or when the view asks for what only the server can answer, `isReady` is false and
 * the server's drawing stands.
 */
export const usePagesClientRows = (input: PagesViewLiveInput, isEnabled: boolean): PagesClientRows => {
  const { bands, pageId, properties, spaceId, view, viewerId } = input;
  const t = useTranslations('pages.collection');
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);
  const addLookups = useContext(PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT);
  const { quickFilter } = usePagesRowQuery();
  const sharedStore = useContext(PAGE_ROW_STORE_CONTEXT);
  const [ownStore] = useState(createPageRowStore);
  const store = sharedStore ?? ownStore;
  const storedRows = useSyncExternalStore(store.subscribe, store.listRows, store.listRows);
  const [state, setState] = useState<PagesClientRowsState>(NOT_LOADED_CLIENT_ROWS);
  const [reloads, setReloads] = useState(0);
  const [shown, setShown] = useState<Readonly<Record<string, number>>>({});
  const scope = readClientScope(view);
  const configuration = readPageViewConfiguration(view.configuration);
  const hasSavedFilter = configuration.filter !== null;
  const latest = useRef({ addLookups, cursor: state.cursor, hasSavedFilter });
  useEffect(() => {
    latest.current = { addLookups, cursor: state.cursor, hasSavedFilter };
  });
  const mismatches = useRef(0);

  useEffect(() => {
    if (!isEnabled) return;
    let isCurrent = true;
    const load = async (): Promise<void> => {
      const read = await readEveryRow(async (cursor) => {
        const result = await callAction(() =>
          readEveryPageRowAction({ ...(cursor === undefined ? {} : { cursor }), pageId, spaceId, viewId: view.id }),
        );
        return isActionSuccess<PageEveryRowRead>(result) ? result.data : null;
      });
      if (!isCurrent) return;
      if (read === null) {
        browserLogger.warn(
          { reason: 'every-row-read-failed', reads: reloads },
          'The rows of a collection could not be held',
        );
        setState((current) => ({ ...current, phase: 'refused' }));
        return;
      }
      store.replaceAll(read.rows);
      latest.current.addLookups({ attachedFiles: read.attachedFiles, relatedRows: read.relatedRows });
      setState({ cursor: read.changesCursor, phase: 'ready', scope });
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [isEnabled, pageId, reloads, scope, spaceId, store, view.id]);

  useEffect(() => {
    if (!isEnabled) return;
    return notices.subscribeStale((cause) => {
      browserLogger.warn({ cause }, 'The rows held of a collection are read again');
      setReloads((count) => count + 1);
    });
  }, [isEnabled, notices]);

  const refusal = useMemo(
    () =>
      viewerId === null && (namesViewer(configuration.filter) || namesViewer(quickFilter)) ? 'viewer-marker' : null,
    [configuration.filter, quickFilter, viewerId],
  );
  const reading = useMemo(() => {
    if (state.phase !== 'ready' || refusal !== null) return null;
    return readClientView({
      properties,
      quickFilter,
      readNow: Date.now,
      rows: storedRows,
      shown,
      statusGroupLabel: (group) => t(`statusGroups.${group}`),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      view,
      viewerId: viewerId ?? '',
    });
  }, [state.phase, storedRows, refusal, properties, quickFilter, shown, view, viewerId, t]);
  const failure = reading?.isFail() === true ? reading.getError() : refusal;
  useEffect(() => {
    if (failure !== null) browserLogger.warn({ reason: failure }, 'A view could not be drawn from the rows held');
  }, [failure]);

  const isActive = isEnabled && state.phase === 'ready' && failure === null;
  const createController = () =>
    createChangesController<'total-mismatch'>({
      apply: async (batch) => {
        store.upsertRows(batch.rows);
        store.removeRows(batch.trashedIds);
        if (latest.current.hasSavedFilter || store.listRows().length === batch.total) {
          mismatches.current = 0;
          return null;
        }
        mismatches.current += 1;
        return mismatches.current > 1 ? null : 'total-mismatch';
      },
      coalesceMs: PAGE_COLLECTION_LIVE_COALESCE_MS,
      initialCursor: latest.current.cursor ?? '',
      onLookups: (changes) =>
        latest.current.addLookups({ attachedFiles: changes.attachedFiles, relatedRows: changes.relatedRows }),
      readChanges: async (cursor) => {
        const result = await callAction(() => readPageCollectionChangesAction({ cursor, pageId, spaceId }));
        return isActionSuccess<PageCollectionChanges>(result) ? result.data : null;
      },
      requestRefresh: (reason) => {
        browserLogger.warn({ reason }, 'The rows held of a collection are read again');
        setReloads((count) => count + 1);
      },
    });

  usePagesCollectionFollowing({
    changesCursor: isActive ? state.cursor : null,
    createController,
    enabled: isActive,
    onViewReordered: () => setReloads((count) => count + 1),
    pageId,
    spaceId,
    view,
  });

  const readyReading = reading?.isOk() === true ? reading.getValue() : null;
  const aggregates = useMemo(() => Promise.resolve(readyReading?.aggregates ?? null), [readyReading]);
  const shownBands = readyReading?.bands ?? bands;

  return {
    aggregates,
    bands: shownBands,
    isLoading: () => false,
    isReady: readyReading !== null,
    loadMore: (bandKey, groupKey) => {
      const held = shownBands.find((band) => band.key === bandKey)?.groups.find((group) => group.key === groupKey);
      const count = (held?.rows.length ?? 0) + PAGE_VIEW_CONTINUATION_ROWS;
      setShown((current) => ({ ...current, [toShownKey(bandKey, groupKey)]: count }));
    },
    resetLoaded: noop,
    store,
  };
};
