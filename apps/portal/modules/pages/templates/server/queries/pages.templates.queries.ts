import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_TEMPLATE_API_ROUTES } from '../../constants/pages.templates.constants';
import { pageTemplateListingSchema } from '../../schemas/pages.templates.schemas';
import type { PageTemplateListing } from '../../types/pages.templates.types';

/** The templates a collection offers its new rows, and which one is the default. */
export const getPageTemplates = async (
  spaceId: string,
  collectionId: string,
): Promise<Result<PageTemplateListing, Error>> =>
  withQuery({ op: 'getPageTemplates', params: { collectionId, spaceId } }, (accessToken) =>
    getPageTemplatesCached(accessToken, spaceId, collectionId),
  );

const getPageTemplatesCached = async (
  accessToken: string,
  spaceId: string,
  collectionId: string,
): Promise<PageTemplateListing> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGES_CACHE_TAG(spaceId));

  const response = await apiRequest<unknown>(PAGE_TEMPLATE_API_ROUTES.list(spaceId, collectionId), accessToken);
  return pageTemplateListingSchema.parse(response);
};
