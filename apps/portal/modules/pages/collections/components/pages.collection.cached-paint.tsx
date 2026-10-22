'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useContext, useLayoutEffect, useMemo } from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  PAGE_COLLECTION_DAY_SEARCH_PARAM,
  PAGE_COLLECTION_MONTH_SEARCH_PARAM,
  PAGE_COLLECTION_QUICK_FILTER_SEARCH_PARAM,
  PAGE_COLLECTION_ROW_SEARCH_PARAM,
  PAGE_COLLECTION_VIEW_SEARCH_PARAM,
} from '../constants/pages.collections.constants';
import { PAGE_VIEW_PAINT_MARK } from '../constants/pages.view-cache.constants';
import { PAGE_COLLECTION_CACHE_CONTEXT } from '../constants/pages.view-cache.context.constants';
import { usePagesCachedRevalidation } from '../hooks/use.pages.cached-revalidation';
import { readCachedPaint } from '../lib/pages.cached-paint.lib';
import { readCollectionQuickFilter } from '../lib/pages.collection.view-selection.lib';
import { buildViewCacheKey } from '../lib/pages.view-cache.lib';
import { PagesCollectionCachedBody } from './pages.collection.cached-body';

/**
 * What the portal shows while the server answers a page: a collection the person saw before is drawn at once from the
 * cache, marked as being updated, and brought up to date with what changed since. Anything else is the skeleton.
 */
export const PagesCollectionCachedPaint = () => {
  const t = useTranslations('pages.collection');
  const session = useContext(PAGE_COLLECTION_CACHE_CONTEXT);
  const params = useParams<{ pageId: string; spaceId: string }>();
  const searchParams = useSearchParams();
  const search = searchParams.get(PAGE_COLLECTION_ROW_SEARCH_PARAM);
  const filter = searchParams.get(PAGE_COLLECTION_QUICK_FILTER_SEARCH_PARAM);
  const key = buildViewCacheKey({
    day: searchParams.get(PAGE_COLLECTION_DAY_SEARCH_PARAM),
    filter,
    month: searchParams.get(PAGE_COLLECTION_MONTH_SEARCH_PARAM),
    pageId: params.pageId,
    search,
    viewName: searchParams.get(PAGE_COLLECTION_VIEW_SEARCH_PARAM) ?? '',
  });
  const paint = useMemo(() => (session === null ? null : readCachedPaint(session.cache, key)), [key, session]);
  const quickFilter = useMemo(() => readCollectionQuickFilter(filter ?? undefined), [filter]);
  const revalidation = usePagesCachedRevalidation({
    hasSearch: (search ?? '') !== '',
    pageId: params.pageId,
    paint,
    quickFilter,
    session,
    spaceId: params.spaceId,
  });
  const isShown = paint !== null && !revalidation.isPurged;

  useLayoutEffect(() => {
    if (isShown) performance.mark(PAGE_VIEW_PAINT_MARK.cache);
  }, [isShown]);

  if (!isShown) {
    return (
      <main className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  return (
    <main className="min-h-full space-y-3 p-4 sm:p-6" data-testid="collection-cached-paint">
      <p className="text-muted-foreground text-xs" role="status">
        {t('updating')}
      </p>
      <div aria-busy="true" inert>
        <PagesCollectionCachedBody
          bands={revalidation.bands}
          read={paint.read}
          spaceId={params.spaceId}
          window={revalidation.window}
        />
      </div>
    </main>
  );
};
