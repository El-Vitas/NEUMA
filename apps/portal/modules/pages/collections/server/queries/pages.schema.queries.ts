import 'server-only';

import type { PageQueryRequest, Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { ApiError } from '@/shared/lib/api';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_API_ROUTES } from '../../../constants/pages.constants';
import {
  pageQueryResponseSchema,
  pageSchemaSchema,
  pageSpaceCollectionsResponseSchema,
} from '../../schemas/pages.schema.schemas';
import type { PageQueryResult } from '../../types/pages.query.types';
import type { PageRelatedRow, PageSchema } from '../../types/pages.schema.types';

const isNotFoundError = (error: unknown): boolean => error instanceof ApiError && error.status === 404;

export const getPageSchema = async (spaceId: string, pageId: string): Promise<Result<PageSchema, Error>> =>
  withQuery({ op: 'getPageSchema', params: { pageId, spaceId } }, (accessToken) =>
    getPageSchemaCached(accessToken, spaceId, pageId),
  );

const getPageSchemaCached = async (accessToken: string, spaceId: string, pageId: string): Promise<PageSchema> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.schema(spaceId, pageId), accessToken);
  return pageSchemaSchema.parse(response);
};

/** The collections of a space the caller can open, which is what a relation property may point to. */
export const getSpaceCollections = async (spaceId: string): Promise<Result<readonly PageRelatedRow[], Error>> =>
  withQuery({ op: 'getSpaceCollections', params: { spaceId } }, (accessToken) =>
    getSpaceCollectionsCached(accessToken, spaceId),
  );

const getSpaceCollectionsCached = async (accessToken: string, spaceId: string): Promise<readonly PageRelatedRow[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.collections(spaceId), accessToken);
  return pageSpaceCollectionsResponseSchema.parse(response);
};

/** Asks for the reducers a view needs. Null when the page or the view is gone. */
export const queryPageView = async (
  spaceId: string,
  pageId: string,
  request: PageQueryRequest,
): Promise<Result<PageQueryResult | null, Error>> =>
  withQuery({ op: 'queryPageView', params: { pageId, request, spaceId } }, (accessToken) =>
    queryPageViewCached(accessToken, spaceId, pageId, JSON.stringify(request)),
  );

const queryPageViewCached = async (
  accessToken: string,
  spaceId: string,
  pageId: string,
  requestJson: string,
): Promise<PageQueryResult | null> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  try {
    const response = await apiRequest<unknown>(PAGE_API_ROUTES.query(spaceId, pageId), accessToken, {
      body: requestJson,
      method: 'POST',
    });
    return pageQueryResponseSchema.parse(response);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
};
