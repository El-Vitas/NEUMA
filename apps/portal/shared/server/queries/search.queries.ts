import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { SEARCH_CACHE_TAG } from '../../constants/search.constants';
import { buildSearchApiEndpoint, mapSearchResponse } from '../../lib/search.lib';
import type { SearchPage, SearchQuery } from '../../types/search.types';

export const getSearchResults = async (
  params: SearchQuery,
  extraParams: Readonly<Record<string, string>> = {},
): Promise<Result<SearchPage, Error>> =>
  withQuery({ op: 'getSearchResults', params: { ...params, ...extraParams } }, (accessToken) =>
    getSearchResultsCached(accessToken, params, extraParams),
  );

const getSearchResultsCached = async (
  accessToken: string,
  params: SearchQuery,
  extraParams: Readonly<Record<string, string>>,
): Promise<SearchPage> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(SEARCH_CACHE_TAG);

  const response = await apiRequest<unknown>(buildSearchApiEndpoint(params, extraParams), accessToken);
  return mapSearchResponse(response);
};
