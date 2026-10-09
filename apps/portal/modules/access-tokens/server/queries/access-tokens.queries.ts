import 'server-only';

import type { Result } from '@company-brain/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { ACCESS_TOKEN_API_ROUTES, ACCESS_TOKENS_CACHE_TAG } from '../../constants/access-tokens.constants';
import { accessTokensListSchema, workspaceAccessTokensListSchema } from '../../schemas/access-tokens.schemas';
import type { AccessToken, WorkspaceAccessToken } from '../../types/access-tokens.types';

export const getAccessTokens = async (): Promise<Result<readonly AccessToken[], Error>> =>
  withQuery({ op: 'getAccessTokens' }, (accessToken) => getAccessTokensCached(accessToken));

const getAccessTokensCached = async (accessToken: string): Promise<readonly AccessToken[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(ACCESS_TOKENS_CACHE_TAG);

  const response = await apiRequest<unknown>(ACCESS_TOKEN_API_ROUTES.list, accessToken);
  return accessTokensListSchema.parse(response);
};

export const getWorkspaceAccessTokens = async (): Promise<Result<readonly WorkspaceAccessToken[], Error>> =>
  withQuery({ op: 'getWorkspaceAccessTokens' }, (accessToken) => getWorkspaceAccessTokensCached(accessToken));

const getWorkspaceAccessTokensCached = async (accessToken: string): Promise<readonly WorkspaceAccessToken[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(ACCESS_TOKENS_CACHE_TAG);

  const response = await apiRequest<unknown>(ACCESS_TOKEN_API_ROUTES.workspace, accessToken);
  return workspaceAccessTokensListSchema.parse(response);
};
