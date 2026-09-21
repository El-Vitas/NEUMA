import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
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
 * Which space a page lives in now.
 *
 * Asked when an address does not find it where it says: a page that changed
 * space left every link written before the move pointing at the space it left.
 */
export const getPageSpaceId = async (pageId: string): Promise<Result<string, Error>> =>
  withQuery({ op: 'getPageSpace', params: { pageId } }, (accessToken) => getPageSpaceIdCached(accessToken, pageId));

const getPageSpaceIdCached = async (accessToken: string, pageId: string): Promise<string> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGE_LOCATION_CACHE_TAG(pageId));

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.location(pageId), accessToken);
  return pageLocationSchema.parse(response).spaceId;
};

/** The pages this person was given, across every space they can reach. */
export const getAssignedPages = async (): Promise<Result<readonly PageSummary[], Error>> =>
  withQuery({ op: 'getAssignedPages' }, (accessToken) => getAssignedPagesCached(accessToken));

const getAssignedPagesCached = async (accessToken: string): Promise<readonly PageSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_ASSIGNED_CACHE_TAG);

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.assigned, accessToken);
  return readPagesThatCanBeRead(response, 'getAssignedPages');
};
