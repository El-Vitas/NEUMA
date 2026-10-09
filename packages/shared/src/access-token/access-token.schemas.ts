import { z } from 'zod';
import {
  ACCESS_TOKEN_PAGE_GRANT_LIMIT,
  ACCESS_TOKEN_PERMISSION_VALUES,
  ACCESS_TOKEN_SPACE_GRANT_LIMIT,
  ACCESS_TOKEN_SPACE_ID_MAX_LENGTH,
} from './access-token.definitions.js';
import { hasAccessTokenAnyPermission } from './access-token.lib.js';

export const accessTokenPermissionSchema = z.enum(ACCESS_TOKEN_PERMISSION_VALUES);

/** Deduplicated. Empty is valid: it is an exclusion. */
const permissionListSchema = z
  .array(accessTokenPermissionSchema)
  .max(ACCESS_TOKEN_PERMISSION_VALUES.length * 2)
  .transform((permissions) => [...new Set(permissions)]);

const spaceGrantSchema = z.object({
  permissions: permissionListSchema,
  spaceId: z.string().min(1).max(ACCESS_TOKEN_SPACE_ID_MAX_LENGTH),
});

const pageGrantSchema = z.object({
  pageId: z.uuid(),
  permissions: permissionListSchema,
});

const namesEachOnce = (ids: readonly string[]): boolean => new Set(ids).size === ids.length;

/** Validates shape only; whether the owner may grant these permissions there is decided by the server. */
export const accessTokenAccessSchema = z
  .object({
    allSpaces: permissionListSchema,
    pages: z.array(pageGrantSchema).max(ACCESS_TOKEN_PAGE_GRANT_LIMIT),
    spaces: z.array(spaceGrantSchema).max(ACCESS_TOKEN_SPACE_GRANT_LIMIT),
  })
  .refine((access) => namesEachOnce(access.spaces.map((grant) => grant.spaceId)), {
    message: 'Each space can have only one rule.',
    path: ['spaces'],
  })
  .refine((access) => namesEachOnce(access.pages.map((grant) => grant.pageId)), {
    message: 'Each page can have only one rule.',
    path: ['pages'],
  })
  .refine(hasAccessTokenAnyPermission, { message: 'The token must give at least one permission somewhere.' });
