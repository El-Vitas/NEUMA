import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { SPACE_MEMBERS_API_ROUTE, SPACE_MEMBERS_CACHE_TAG } from '../../constants/space-members.constants';
import { spaceMembersListSchema } from '../../schemas/space-members.schemas';
import type { SpaceMember } from '../../types/space-members.types';

export const getSpaceMembers = async (spaceId: string): Promise<Result<readonly SpaceMember[], Error>> =>
  withQuery({ op: 'getSpaceMembers', params: { spaceId } }, (accessToken) =>
    getSpaceMembersCached(accessToken, spaceId),
  );

const getSpaceMembersCached = async (accessToken: string, spaceId: string): Promise<readonly SpaceMember[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(SPACE_MEMBERS_CACHE_TAG(spaceId));

  const response = await apiRequest<unknown>(SPACE_MEMBERS_API_ROUTE(spaceId), accessToken);
  return spaceMembersListSchema.parse(response);
};
