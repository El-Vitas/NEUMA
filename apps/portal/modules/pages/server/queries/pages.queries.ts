import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_API_ROUTES, PAGES_CACHE_TAG } from '../../constants/pages.constants';
import { pagesListSchema } from '../../schemas/pages.schemas';
import type { PageSummary } from '../../types/pages.types';

export const getPages = async (spaceId: string): Promise<Result<readonly PageSummary[], Error>> =>
  withQuery({ op: 'getPages', params: { includeTrashed: true, spaceId } }, (accessToken) =>
    getPagesCached(accessToken, spaceId),
  );

const getPagesCached = async (accessToken: string, spaceId: string): Promise<readonly PageSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.list(spaceId, true), accessToken);
  return pagesListSchema.parse(response);
};
