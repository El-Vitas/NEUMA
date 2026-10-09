import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { cache } from 'react';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_API_ROUTES, PAGE_LOCATION_CACHE_TAG, PAGES_ASSIGNED_CACHE_TAG } from '../../constants/pages.constants';
import { pageLocationSchema } from '../../schemas/pages.schemas';
import type { PageSummary } from '../../types/pages.types';
import { readPagesThatCanBeRead } from '../lib/pages.reading.server';

export const getPages = async (spaceId: string): Promise<Result<readonly PageSummary[], Error>> =>
  withQuery({ op: 'getPages', params: { includeTrashed: true, spaceId } }, (accessToken) =>
    getPagesCached(accessToken, spaceId),
  );

const getPagesCached = async (accessToken: string, spaceId: string): Promise<readonly PageSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.list(spaceId, true), accessToken);
  return readPagesThatCanBeRead(response, 'getPages');
};

/**
 * Uncached read for a page the cached list does not have yet, e.g. one written through the MCP.
 * Deduplicated per request only, so unknown addresses leave nothing behind.
 */
export const getPagesHolding = async (
  spaceId: string,
  pageId: string,
): Promise<Result<readonly PageSummary[], Error>> =>
  withQuery({ op: 'getPagesHolding', params: { pageId, spaceId } }, (accessToken) =>
    readPagesFresh(accessToken, spaceId),
  );

const readPagesFresh = cache(async (accessToken: string, spaceId: string): Promise<readonly PageSummary[]> => {
  const response = await apiRequest<unknown>(PAGE_API_ROUTES.list(spaceId, true), accessToken);
  return readPagesThatCanBeRead(response, 'getPagesHolding');
});

/** Resolves links to a page that moved to another space after the link was written. */
export const getPageSpaceId = async (pageId: string): Promise<Result<string, Error>> =>
  withQuery({ op: 'getPageSpace', params: { pageId } }, (accessToken) => getPageSpaceIdCached(accessToken, pageId));

const getPageSpaceIdCached = async (accessToken: string, pageId: string): Promise<string> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGE_LOCATION_CACHE_TAG(pageId));

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.location(pageId), accessToken);
  return pageLocationSchema.parse(response).spaceId;
};

export const getAssignedPages = async (): Promise<Result<readonly PageSummary[], Error>> =>
  withQuery({ op: 'getAssignedPages' }, (accessToken) => getAssignedPagesCached(accessToken));

const getAssignedPagesCached = async (accessToken: string): Promise<readonly PageSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_ASSIGNED_CACHE_TAG);

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.assigned, accessToken);
  return readPagesThatCanBeRead(response, 'getAssignedPages');
};
