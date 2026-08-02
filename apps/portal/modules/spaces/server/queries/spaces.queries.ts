import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { SPACE_API_ROUTES, SPACES_CACHE_TAG } from '../../constants/spaces.constants';
import { spacesListSchema } from '../../schemas/spaces.schemas';
import type { SpaceSummary } from '../../types/spaces.types';

export const getSpaces = async (): Promise<Result<readonly SpaceSummary[], Error>> =>
  withQuery({ op: 'getSpaces' }, (accessToken) => getSpacesCached(accessToken));

const getSpacesCached = async (accessToken: string): Promise<readonly SpaceSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(SPACES_CACHE_TAG);

  const response = await apiRequest<unknown>(SPACE_API_ROUTES.list, accessToken);
  return spacesListSchema.parse(response);
};
