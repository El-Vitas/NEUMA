import {
  ACCESS_TOKEN_NAME_MAX_LENGTH,
  accessTokenAccessSchema,
  accessTokenPermissionSchema,
} from '@company-brain/shared';
import { z } from 'zod';
import { ACCESS_TOKEN_EXPIRY_VALUES } from '../constants/access-tokens.constants';

const namedGrantSchema = z.object({
  permissions: z.array(accessTokenPermissionSchema),
  spaceId: z.string(),
  spaceName: z.string(),
});

export const accessTokenSchema = z.object({
  allSpaces: z.array(accessTokenPermissionSchema),
  createdAt: z.coerce.date(),
  displayPrefix: z.string(),
  expiresAt: z.coerce.date().nullable(),
  hiddenSpaceCount: z.number().int().min(0),
  id: z.string(),
  lastUsedAt: z.coerce.date().nullable(),
  name: z.string(),
  spaces: z.array(namedGrantSchema),
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

export const accessTokenCreateSchema = z.object({
  access: accessTokenAccessSchema,
  expiry: z.enum(ACCESS_TOKEN_EXPIRY_VALUES),
  name: z.string().trim().min(1).max(ACCESS_TOKEN_NAME_MAX_LENGTH),
});

export const accessTokenAccessUpdateSchema = z.object({
  access: accessTokenAccessSchema,
  tokenId: z.uuid(),
});

export const accessTokenRevokeSchema = z.object({
  tokenId: z.uuid(),
});
