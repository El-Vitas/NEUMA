import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { SPACE_API_ROUTES, SPACE_MEMBERS_CACHE_TAG, SPACES_CACHE_TAG } from '../../constants/spaces.constants';
import { spaceMembersListSchema, spacesListSchema } from '../../schemas/spaces.schemas';
import type { SpaceMember, SpaceSummary } from '../../types/spaces.types';

export const getSpaces = async (): Promise<Result<readonly SpaceSummary[], Error>> =>
  withQuery({ op: 'getSpaces' }, (accessToken) => getSpacesCached(accessToken));

const getSpacesCached = async (accessToken: string): Promise<readonly SpaceSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(SPACES_CACHE_TAG);

  const response = await apiRequest<unknown>(SPACE_API_ROUTES.list, accessToken);
  return spacesListSchema.parse(response);
};

export const getSpaceMembers = async (spaceId: string): Promise<Result<readonly SpaceMember[], Error>> =>
  withQuery({ op: 'getSpaceMembers', params: { spaceId } }, (accessToken) =>
    getSpaceMembersCached(accessToken, spaceId),
  );

const getSpaceMembersCached = async (accessToken: string, spaceId: string): Promise<readonly SpaceMember[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(SPACE_MEMBERS_CACHE_TAG(spaceId));

  const response = await apiRequest<unknown>(SPACE_API_ROUTES.members(spaceId), accessToken);
  return spaceMembersListSchema.parse(response);
};
