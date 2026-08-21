import 'server-only';

import type { Result } from '@company-brain/shared';
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

/** What other people made private and then shared, distinct from what the caller made public or restricted. */
export const getSharedWithMeSpaces = async (): Promise<Result<readonly SpaceSummary[], Error>> =>
  withQuery({ op: 'getSharedWithMeSpaces' }, (accessToken) => getSharedWithMeSpacesCached(accessToken));

const getSharedWithMeSpacesCached = async (accessToken: string): Promise<readonly SpaceSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(SPACES_SHARED_WITH_ME_CACHE_TAG);

  const response = await apiRequest<unknown>(SPACE_API_ROUTES.sharedWithMe, accessToken);
  return spacesListSchema.parse(response);
};

/** The members of a space, read through the query `shared/` also hands the pages module — a space belongs to the spaces module, but neither module may import the other directly. */
export const getSpaceMembers = (spaceId: string): Promise<Result<readonly SpaceMember[], Error>> =>
  getSharedSpaceMembers(spaceId);
