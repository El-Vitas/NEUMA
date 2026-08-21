import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { ApiError } from '@/shared/lib/api';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_API_ROUTES } from '../../constants/pages.constants';
import { pageSchemaSchema, pageViewOutcomeSchema } from '../../schemas/pages.schema.schemas';
import type { PageSchema, PageViewOutcome } from '../../types/pages.schema.types';

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

export const getPageView = async (
  spaceId: string,
  pageId: string,
  viewName: string,
): Promise<Result<PageViewOutcome | null, Error>> =>
  withQuery({ op: 'getPageView', params: { pageId, spaceId, viewName } }, (accessToken) =>
    getPageViewCached(accessToken, spaceId, pageId, viewName),
  );

const getPageViewCached = async (
  accessToken: string,
  spaceId: string,
  pageId: string,
  viewName: string,
): Promise<PageViewOutcome | null> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  try {
    const response = await apiRequest<unknown>(PAGE_API_ROUTES.view(spaceId, pageId, viewName), accessToken);
    return pageViewOutcomeSchema.parse(response);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
};
