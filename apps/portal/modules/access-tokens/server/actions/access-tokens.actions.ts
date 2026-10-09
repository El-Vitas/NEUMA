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

/**
 * Las páginas que se pueden nombrar en un token: las que encuentra la búsqueda
 * de quien lo crea, que ya solo ve lo que su dueño ve. Nombrarlas no las da:
 * al guardar, el servidor vuelve a mirar que el dueño las vea y sigan vivas.
 */
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

/** Revocar el token de cualquiera: el servidor solo lo deja a quien administra el espacio de trabajo. */
export const revokeWorkspaceAccessTokenAction = actionClient
  .inputSchema(accessTokenRevokeSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'revokeWorkspaceAccessToken' }, async () => {
      await apiServer.del<unknown>(ACCESS_TOKEN_API_ROUTES.workspaceItem(parsedInput.tokenId));
      updateTag(ACCESS_TOKENS_CACHE_TAG);
    }),
  );
