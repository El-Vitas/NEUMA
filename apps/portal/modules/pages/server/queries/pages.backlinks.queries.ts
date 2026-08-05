import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_API_ROUTES, PAGE_BACKLINKS_CACHE_TAG } from '../../constants/pages.constants';
import { pageBacklinksResultSchema } from '../../schemas/pages.backlinks.schemas';
import type { PageBacklinksResult } from '../../types/pages.backlinks.types';

export const getPageBacklinks = async (pageId: string): Promise<Result<PageBacklinksResult, Error>> =>
  withQuery({ op: 'getPageBacklinks', params: { pageId } }, (accessToken) =>
    getPageBacklinksCached(accessToken, pageId),
  );

const getPageBacklinksCached = async (accessToken: string, pageId: string): Promise<PageBacklinksResult> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGE_BACKLINKS_CACHE_TAG(pageId));

  const response = await apiRequest<unknown>(PAGE_API_ROUTES.backlinks(pageId), accessToken);
  return pageBacklinksResultSchema.parse(response);
};
