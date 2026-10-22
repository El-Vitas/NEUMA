'use client';

import { useSearchParams } from 'next/navigation';
import { useContext, useEffect } from 'react';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';
import {
  PAGE_COLLECTION_DAY_SEARCH_PARAM,
  PAGE_COLLECTION_MONTH_SEARCH_PARAM,
  PAGE_COLLECTION_QUICK_FILTER_SEARCH_PARAM,
  PAGE_COLLECTION_ROW_SEARCH_PARAM,
  PAGE_COLLECTION_VIEW_SEARCH_PARAM,
} from '../constants/pages.collections.constants';
import { CACHE_PURGING_CAUSES, PAGE_VIEW_PAINT_MARK } from '../constants/pages.view-cache.constants';
import { PAGE_COLLECTION_CACHE_CONTEXT } from '../constants/pages.view-cache.context.constants';
import { forgetRevokedRows } from '../lib/pages.cache-revocation.lib';
import { purgeCollectionRows } from '../lib/pages.cached-paint.lib';
import { listDroppedIds, readRevokedRows } from '../lib/pages.revoked-rows.lib';
import { buildViewCacheKey, toCachedView } from '../lib/pages.view-cache.lib';
import type { PagesViewCachingInput } from '../types/pages.view-cache.types';

/**
 * Keeps what the server drew of a view in the cache of the browser, under the question the address asked, so the next
 * visit can be painted from it while the server answers (ADR 029). A failure is logged and never stops the view.
 */
export const usePagesViewCaching = (input: PagesViewCachingInput): void => {
  const { aggregates, changesCursor, lookups, outcome, pageId, personOptions, schema, view, viewerId } = input;
  const session = useContext(PAGE_COLLECTION_CACHE_CONTEXT);
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);
  const searchParams = useSearchParams();
  const key = buildViewCacheKey({
    day: searchParams.get(PAGE_COLLECTION_DAY_SEARCH_PARAM),
    filter: searchParams.get(PAGE_COLLECTION_QUICK_FILTER_SEARCH_PARAM),
    month: searchParams.get(PAGE_COLLECTION_MONTH_SEARCH_PARAM),
    pageId,
    search: searchParams.get(PAGE_COLLECTION_ROW_SEARCH_PARAM),
    viewName: searchParams.get(PAGE_COLLECTION_VIEW_SEARCH_PARAM) ?? '',
  });

  useEffect(() => {
    performance.mark(PAGE_VIEW_PAINT_MARK.server);
  }, []);

  useEffect(() => {
    if (session === null) return;
    return notices.subscribeStale((cause) => {
      if (!CACHE_PURGING_CAUSES.includes(cause)) return;
      purgeCollectionRows(session.cache, pageId).catch((error: unknown) => {
        browserLogger.error({ err: error }, 'The rows of a collection could not be forgotten');
      });
    });
  }, [notices, pageId, session]);

  useEffect(() => {
    if (session === null) return;
    let isCurrent = true;
    const keep = async (): Promise<void> => {
      const counted = await aggregates;
      if (!isCurrent) return;
      const cached = toCachedView({ aggregates: counted, lookups, outcome, personOptions, schema, view, viewerId });
      const dropped = listDroppedIds(session.cache.readResult(key)?.result.ids ?? [], cached.ids);
      await session.cache.saveRecords(
        cached.rows.map((row) => ({ id: row.id, row, spaceId: row.spaceId, version: row.version })),
      );
      await session.cache.saveResult({
        changesCursor,
        collectionId: pageId,
        ids: cached.ids,
        key,
        layout: cached.layout,
        schemaVersion: 0,
        total: counted?.distinctRowCount ?? cached.ids.length,
        viewVersion: view.version,
      });
      await session.cache.enforceBudget(new Set([key]));
      await forgetRevokedRows({ cache: session.cache, droppedIds: dropped, readRevoked: readRevokedRows });
    };
    keep().catch((error: unknown) => {
      browserLogger.error({ err: error }, 'A view could not be kept in the local cache');
    });
    return () => {
      isCurrent = false;
    };
  }, [aggregates, changesCursor, key, lookups, outcome, pageId, personOptions, schema, session, view, viewerId]);
};
