import 'server-only';
import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { USERS_CACHE_TAG } from '../../constants/users.constants';
import { buildUsersApiEndpoint } from '../../lib/users.lib';
import type { UsersList, UsersListParams } from '../../types/users.types';

export const getUsers = async (params: UsersListParams): Promise<Result<UsersList, Error>> =>
  withQuery({ op: 'getUsers', params }, (accessToken) => getUsersCached(accessToken, params));

const getUsersCached = async (accessToken: string, params: UsersListParams): Promise<UsersList> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(USERS_CACHE_TAG);

  return apiRequest<UsersList>(buildUsersApiEndpoint(params), accessToken);
};
