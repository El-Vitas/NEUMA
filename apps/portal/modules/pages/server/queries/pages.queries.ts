import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { cache } from 'react';
import { ApiError } from '@/shared/lib/api';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_API_ROUTES, PAGE_LOCATION_CACHE_TAG, PAGES_ASSIGNED_CACHE_TAG } from '../../constants/pages.constants';
import { pageComputedValuesSchema, pageLocationSchema, pageSummarySchema } from '../../schemas/pages.schemas';
import type { PageComputedValues, PageSummary } from '../../types/pages.types';
import { readPagesThatCanBeRead } from '../lib/pages.reading.server';

/**
 * One page with its document, as the reader sees it. It is asked for by its address, which also reaches a template
 * (ADR 027) or a page written through the MCP a moment ago, and it is read once per request however many parts of the
 * page ask. Null when the page does not exist or the reader cannot open it.
 */
export const getPage = async (spaceId: string, pageId: string): Promise<Result<PageSummary | null, Error>> =>
  withQuery({ op: 'getPage', params: { pageId, spaceId } }, (accessToken) =>
    readPageFresh(accessToken, spaceId, pageId),
  );

const readPageFresh = cache(
  async (accessToken: string, spaceId: string, pageId: string): Promise<PageSummary | null> => {
    try {
      return pageSummarySchema.parse(await apiRequest<unknown>(PAGE_API_ROUTES.item(spaceId, pageId), accessToken));
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
      throw error;
    }
  },
);

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

/**
 * The values of a row with its formulas and rollups computed for the reader. The list leaves them out, since
 * computing them for every page of a space would cost far more than one row on its own page needs.
 */
export const getPageComputedValues = async (
  spaceId: string,
  pageId: string,
): Promise<Result<PageComputedValues, Error>> =>
  withQuery({ op: 'getPageComputedValues', params: { pageId, spaceId } }, async (accessToken) => {
    const response = await apiRequest<unknown>(PAGE_API_ROUTES.item(spaceId, pageId), accessToken);
    return pageComputedValuesSchema.parse(response);
  });

export const getAssignedPages = async (): Promise<Result<readonly PageSummary[], Error>> =>
  withQuery({ op: 'getAssignedPages' }, (accessToken) => getAssignedPagesCached(accessToken));

const getAssignedPagesCached = async (accessToken: string): Promise<readonly PageSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_ASSIGNED_CACHE_TAG);

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.assigned, accessToken);
  return readPagesThatCanBeRead(response, 'getAssignedPages');
};
