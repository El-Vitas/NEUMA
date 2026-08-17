import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import type { FavoritePage } from '@/shared/types/favorites.types';
import { FAVORITE_API_ROUTES, FAVORITES_CACHE_TAG } from '../../constants/favorites.constants';
import { favoritePagesListSchema } from '../../schemas/favorites.schemas';

export const getFavoritePages = async (): Promise<Result<readonly FavoritePage[], Error>> =>
  withQuery({ op: 'getFavoritePages' }, (accessToken) => getFavoritePagesCached(accessToken));

const getFavoritePagesCached = async (accessToken: string): Promise<readonly FavoritePage[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(FAVORITES_CACHE_TAG);

  const response = await apiRequest<unknown>(FAVORITE_API_ROUTES.list, accessToken);
  return favoritePagesListSchema.parse(response);
};
