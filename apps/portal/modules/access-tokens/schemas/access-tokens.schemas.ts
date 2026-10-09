import {
  ACCESS_TOKEN_NAME_MAX_LENGTH,
  accessTokenAccessSchema,
  accessTokenPermissionSchema,
} from '@company-brain/shared';
import { z } from 'zod';
import { SEARCH_MAX_QUERY_LENGTH } from '@/shared/constants/search.constants';

const namedSpaceGrantSchema = z.object({
  permissions: z.array(accessTokenPermissionSchema),
  spaceId: z.string(),
  spaceName: z.string(),
});

const namedPageGrantSchema = z.object({
  pageId: z.string(),
  pageTitle: z.string(),
  permissions: z.array(accessTokenPermissionSchema),
  spaceName: z.string(),
});

export const accessTokenSchema = z.object({
  allSpaces: z.array(accessTokenPermissionSchema),
  createdAt: z.coerce.date(),
  displayPrefix: z.string(),
  expiresAt: z.coerce.date().nullable(),
  hiddenPlaceCount: z.number().int().min(0),
  id: z.string(),
  lastUsedAt: z.coerce.date().nullable(),
  name: z.string(),
  pages: z.array(namedPageGrantSchema),
  spaces: z.array(namedSpaceGrantSchema),
});

export const accessTokensListSchema = z.array(accessTokenSchema);

export const workspaceAccessTokenSchema = accessTokenSchema.extend({
  owner: z.object({ id: z.string(), name: z.string() }),
});

export const workspaceAccessTokensListSchema = z.array(workspaceAccessTokenSchema);

/** Lo que vuelve al crear uno: la única vez que el secreto sale del servidor. */
export const createdAccessTokenSchema = z.object({
  secret: z.string().min(1),
  token: accessTokenSchema,
});

/**
 * Lo que pide la pantalla al crear un token. El vencimiento llega como un
 * instante, ya calculado en la hora de quien lo eligió; el servidor exige que
 * sea después de ahora.
 */
export const accessTokenCreateSchema = z.object({
  access: accessTokenAccessSchema,
  expiresAt: z.iso.datetime().nullable(),
  name: z.string().trim().min(1).max(ACCESS_TOKEN_NAME_MAX_LENGTH),
});

export const accessTokenAccessUpdateSchema = z.object({
  access: accessTokenAccessSchema,
  tokenId: z.uuid(),
});

export const accessTokenRevokeSchema = z.object({
  tokenId: z.uuid(),
});

export const accessTokenPageSearchSchema = z.object({
  query: z.string().trim().max(SEARCH_MAX_QUERY_LENGTH),
});
