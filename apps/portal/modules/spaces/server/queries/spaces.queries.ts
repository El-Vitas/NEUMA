import 'server-only';

import { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { getSpaceMembers as getSharedSpaceMembers } from '@/shared/server/queries/space-members.queries';
import type { SpaceMember } from '@/shared/types/space-members.types';
import { SPACE_API_ROUTES, SPACES_CACHE_TAG, SPACES_SHARED_WITH_ME_CACHE_TAG } from '../../constants/spaces.constants';
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

export const getSharedWithMeSpaces = async (): Promise<Result<readonly SpaceSummary[], Error>> =>
  withQuery({ op: 'getSharedWithMeSpaces' }, (accessToken) => getSharedWithMeSpacesCached(accessToken));

const getSharedWithMeSpacesCached = async (accessToken: string): Promise<readonly SpaceSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(SPACES_SHARED_WITH_ME_CACHE_TAG);

  const response = await apiRequest<unknown>(SPACE_API_ROUTES.sharedWithMe, accessToken);
  return spacesListSchema.parse(response);
};

/** Fails whole when either list fails, so a partial list is never mistaken for the full one. */
export const getReachableSpaces = async (): Promise<Result<readonly SpaceSummary[], Error>> => {
  const [spaces, sharedSpaces] = await Promise.all([getSpaces(), getSharedWithMeSpaces()]);
  if (spaces.isFail()) return spaces;
  if (sharedSpaces.isFail()) return sharedSpaces;
  return Result.ok([...spaces.getValue(), ...sharedSpaces.getValue()]);
};

/** Delegates to `shared/` so the pages module can read members without importing this module. */
export const getSpaceMembers = (spaceId: string): Promise<Result<readonly SpaceMember[], Error>> =>
  getSharedSpaceMembers(spaceId);
