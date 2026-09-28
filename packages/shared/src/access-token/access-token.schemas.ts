import { z } from 'zod';
import {
  ACCESS_TOKEN_PAGE_GRANT_LIMIT,
  ACCESS_TOKEN_PERMISSION_VALUES,
  ACCESS_TOKEN_SPACE_GRANT_LIMIT,
  ACCESS_TOKEN_SPACE_ID_MAX_LENGTH,
} from './access-token.definitions.js';
import { hasAccessTokenAnyPermission } from './access-token.lib.js';

export const accessTokenPermissionSchema = z.enum(ACCESS_TOKEN_PERMISSION_VALUES);

/**
 * Una lista de permisos sin repetidos: repetir uno no da más, solo ensucia lo
 * guardado. Vacía es válida: es una exclusión.
 */
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

/**
 * Lo que un token tiene dado, tal como se acepta al crearlo o cambiarlo, y tal
 * como se vuelve a leer de la base. Se valida la forma aquí; que el dueño pueda
 * dar esos permisos en esos espacios y páginas lo decide el servidor, que es
 * quien sabe qué ve el dueño.
 */
export const accessTokenAccessSchema = z
  .object({
    allSpaces: permissionListSchema,
    pages: z.array(pageGrantSchema).max(ACCESS_TOKEN_PAGE_GRANT_LIMIT),
    spaces: z.array(spaceGrantSchema).max(ACCESS_TOKEN_SPACE_GRANT_LIMIT),
  })
  .refine((access) => namesEachOnce(access.spaces.map((grant) => grant.spaceId)))
  .refine((access) => namesEachOnce(access.pages.map((grant) => grant.pageId)))
  .refine(hasAccessTokenAnyPermission);
