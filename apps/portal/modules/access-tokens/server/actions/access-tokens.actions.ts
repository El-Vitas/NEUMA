'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { getSearchResults } from '@/shared/server/queries/search.queries';
import {
  ACCESS_TOKEN_API_ROUTES,
  ACCESS_TOKEN_PAGE_SEARCH_LIMIT,
  ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH,
  ACCESS_TOKENS_CACHE_TAG,
} from '../../constants/access-tokens.constants';
import {
  accessTokenAccessUpdateSchema,
  accessTokenCreateSchema,
  accessTokenPageSearchSchema,
  accessTokenRevokeSchema,
  accessTokenSchema,
  createdAccessTokenSchema,
} from '../../schemas/access-tokens.schemas';
import type { AccessTokenPageOption } from '../../types/access-tokens.types';

/**
 * The only portal response that carries a secret, so it bypasses every cache. The server rechecks the
 * requested grants against the owner's rights: this action is a public entry point and is not trusted.
 */
export const createAccessTokenAction = actionClient
  .inputSchema(accessTokenCreateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'createAccessToken' }, async () => {
      const created = await apiServer.post<unknown>(ACCESS_TOKEN_API_ROUTES.list, {
        access: parsedInput.access,
        name: parsedInput.name,
        ...(parsedInput.expiresAt === null ? {} : { expiresAt: parsedInput.expiresAt }),
      });
      updateTag(ACCESS_TOKENS_CACHE_TAG);
      return createdAccessTokenSchema.parse(created);
    }),
  );

export const updateAccessTokenAccessAction = actionClient
  .inputSchema(accessTokenAccessUpdateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updateAccessTokenAccess' }, async () => {
      const updated = await apiServer.patch<unknown>(ACCESS_TOKEN_API_ROUTES.access(parsedInput.tokenId), {
        access: parsedInput.access,
      });
      updateTag(ACCESS_TOKENS_CACHE_TAG);
      return accessTokenSchema.parse(updated);
    }),
  );

export const revokeAccessTokenAction = actionClient
  .inputSchema(accessTokenRevokeSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'revokeAccessToken' }, async () => {
      await apiServer.del<unknown>(ACCESS_TOKEN_API_ROUTES.item(parsedInput.tokenId));
      updateTag(ACCESS_TOKENS_CACHE_TAG);
    }),
  );

/** Naming a page does not grant it: on save the server rechecks that the owner can see it and it still exists. */
export const searchGrantablePagesAction = actionClient
  .inputSchema(accessTokenPageSearchSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'searchGrantablePages' }, async (): Promise<readonly AccessTokenPageOption[]> => {
      if (parsedInput.query.length < ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH) return [];
      const result = await getSearchResults({
        limit: ACCESS_TOKEN_PAGE_SEARCH_LIMIT,
        query: parsedInput.query,
        sourceType: 'PAGE',
      });
      if (result.isFail()) throw result.getError();
      return result.getValue().items.map((item) => ({
        id: item.sourceId,
        spaceName: item.spaceName ?? '',
        title: item.title,
      }));
    }),
  );

export const revokeWorkspaceAccessTokenAction = actionClient
  .inputSchema(accessTokenRevokeSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'revokeWorkspaceAccessToken' }, async () => {
      await apiServer.del<unknown>(ACCESS_TOKEN_API_ROUTES.workspaceItem(parsedInput.tokenId));
      updateTag(ACCESS_TOKENS_CACHE_TAG);
    }),
  );
