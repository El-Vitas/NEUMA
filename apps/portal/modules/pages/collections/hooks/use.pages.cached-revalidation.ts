'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useEffect, useState } from 'react';
import { callAction, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { LOST_ACCESS_REASONS, NO_CACHED_REVALIDATION } from '../constants/pages.view-cache.constants';
import { placeCachedChanges, placeCachedWindowChanges } from '../lib/pages.cached-paint.lib';
import { isWindowView } from '../lib/pages.view-cache.lib';
import {
  readPageCollectionChangesAction,
  readPageUndatedCountAction,
} from '../server/actions/pages.collections.actions';
import type { PagesCachedRevalidation, PagesCachedRevalidationInput } from '../types/pages.cached-paint.types';
import type { PageCollectionChanges } from '../types/pages.query.types';

/**
 * Brings a painted copy up to date with what changed since it was read, asking only for the changes (ADR 029). What the
 * browser can place, it places; a reset cursor or a case it cannot place leaves the copy as it is, and the server's own
 * answer, already on its way, replaces it. A refusal of access empties what the cache kept of the page at once.
 */
export const usePagesCachedRevalidation = ({
  hasSearch,
  pageId,
  paint,
  quickFilter,
  session,
  spaceId,
}: PagesCachedRevalidationInput): PagesCachedRevalidation => {
  const [revalidation, setRevalidation] = useState(NO_CACHED_REVALIDATION);

  useEffect(() => {
    if (paint === null || session === null || paint.changesCursor === null) return;
    let isCurrent = true;
    const cursor = paint.changesCursor;

    const forget = async (): Promise<void> => {
      await session.cache.purgeRecords(paint.ids);
      if (isCurrent) setRevalidation({ ...NO_CACHED_REVALIDATION, isPurged: true, key: paint.key });
    };

    const countUndated = async (dateProperty: string): Promise<number | null> => {
      const result = await callAction(() =>
        readPageUndatedCountAction({
          dateProperty,
          pageId,
          quickFilter,
          search: '',
          spaceId,
          viewId: paint.read.view.id,
        }),
      );
      return isActionSuccess<null | number>(result) ? result.data : null;
    };

    const keepPlacedWindow = async (changes: PageCollectionChanges): Promise<void> => {
      const placed = placeCachedWindowChanges({ changes, hasSearch, paint, quickFilter });
      if (placed === null) return;
      const dateProperty = readPageViewConfiguration(paint.read.view.configuration).dateProperty;
      const held = paint.read.calendar?.undated ?? paint.read.timeline?.undated ?? 0;
      const recounted = placed.hasChanged && dateProperty !== null ? await countUndated(dateProperty) : null;
      if (!isCurrent) return;
      const window = { rows: placed.rows, undated: recounted ?? held, undatedRows: placed.undatedRows };
      setRevalidation({ ...NO_CACHED_REVALIDATION, key: paint.key, window });
      await session.cache.saveRecords(placed.bodies);
      await session.cache.validateResult(paint.key, placed.cursor);
    };

    const keepPlaced = async (changes: PageCollectionChanges): Promise<void> => {
      if (isWindowView(paint.read.view.type)) return keepPlacedWindow(changes);
      const placed = placeCachedChanges({ changes, hasSearch, paint, quickFilter });
      if (placed === null) return;
      setRevalidation({ ...NO_CACHED_REVALIDATION, bands: placed.bands, key: paint.key });
      await session.cache.saveRecords(placed.bodies);
      await session.cache.validateResult(paint.key, placed.cursor);
    };

    const revalidate = async (): Promise<void> => {
      const result = await callAction(() => readPageCollectionChangesAction({ cursor, pageId, spaceId }));
      if (!isCurrent) return;
      if (isActionSuccess<PageCollectionChanges>(result)) return keepPlaced(result.data);
      if (LOST_ACCESS_REASONS.includes(readActionFailureReason(result))) return forget();
    };

    revalidate().catch((error: unknown) => {
      browserLogger.error({ err: error }, 'A painted view could not be brought up to date');
    });
    return () => {
      isCurrent = false;
    };
  }, [hasSearch, pageId, paint, quickFilter, session, spaceId]);

  return revalidation.key === paint?.key ? revalidation : NO_CACHED_REVALIDATION;
};
