import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_TRASH_API_ROUTES, PAGE_TRASH_CACHE_TAG } from '../../constants/pages.trash.constants';
import { trashedPagesListSchema } from '../../schemas/pages.trash.schemas';
import type { TrashedPagesListing } from '../../types/pages.trash.types';

/** The first window of the trash; the rest is asked for as the person reaches it. */
export const getTrashedPages = async (search?: string): Promise<Result<TrashedPagesListing, Error>> =>
  withQuery({ op: 'getTrashedPages', params: { search } }, (accessToken) => getTrashedPagesCached(accessToken, search));

const getTrashedPagesCached = async (accessToken: string, search?: string): Promise<TrashedPagesListing> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGE_TRASH_CACHE_TAG);

  const response = await apiRequest<unknown>(PAGE_TRASH_API_ROUTES.list(undefined, search), accessToken);
  return trashedPagesListSchema.parse(response);
};
