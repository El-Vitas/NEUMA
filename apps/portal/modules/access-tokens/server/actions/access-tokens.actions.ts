'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { ACCESS_TOKEN_API_ROUTES, ACCESS_TOKENS_CACHE_TAG } from '../../constants/access-tokens.constants';
import { readAccessTokenExpiry } from '../../lib/access-tokens.lib';
import {
  accessTokenAccessUpdateSchema,
  accessTokenCreateSchema,
  accessTokenRevokeSchema,
  accessTokenSchema,
  createdAccessTokenSchema,
} from '../../schemas/access-tokens.schemas';

/**
 * Crea un token y devuelve su secreto.
 *
 * Es la única respuesta del portal que lleva un secreto, y por eso no pasa por
 * ninguna caché: vuelve directo a quien lo pidió, que lo ve una vez. Lo que se
 * pide dar lo vuelve a revisar el servidor contra lo que su dueño puede: esta
 * acción es una puerta pública y no se le cree nada.
 */
export const createAccessTokenAction = actionClient
  .inputSchema(accessTokenCreateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'createAccessToken' }, async () => {
      const expiresAt = readAccessTokenExpiry(parsedInput.expiry, new Date());
      const created = await apiServer.post<unknown>(ACCESS_TOKEN_API_ROUTES.list, {
        access: parsedInput.access,
        name: parsedInput.name,
        ...(expiresAt === null ? {} : { expiresAt: expiresAt.toISOString() }),
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

/** Revocar el token de cualquiera: el servidor solo lo deja a quien administra el espacio de trabajo. */
export const revokeWorkspaceAccessTokenAction = actionClient
  .inputSchema(accessTokenRevokeSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'revokeWorkspaceAccessToken' }, async () => {
      await apiServer.del<unknown>(ACCESS_TOKEN_API_ROUTES.workspaceItem(parsedInput.tokenId));
      updateTag(ACCESS_TOKENS_CACHE_TAG);
    }),
  );
