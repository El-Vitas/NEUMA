import { z } from 'zod';
import {
  ACCESS_TOKEN_PERMISSION_VALUES,
  ACCESS_TOKEN_SPACE_GRANT_LIMIT,
  ACCESS_TOKEN_SPACE_ID_MAX_LENGTH,
} from './access-token.definitions.js';
import type { AccessTokenAccess } from './access-token.types.js';

export const accessTokenPermissionSchema = z.enum(ACCESS_TOKEN_PERMISSION_VALUES);

/** Una lista de permisos sin repetidos: repetir uno no da más, solo ensucia lo guardado. */
const permissionListSchema = z
  .array(accessTokenPermissionSchema)
  .max(ACCESS_TOKEN_PERMISSION_VALUES.length * 2)
  .transform((permissions) => [...new Set(permissions)]);

const spaceGrantSchema = z.object({
  permissions: permissionListSchema.refine((permissions) => permissions.length > 0),
  spaceId: z.string().min(1).max(ACCESS_TOKEN_SPACE_ID_MAX_LENGTH),
});

const namesEachSpaceOnce = (access: AccessTokenAccess): boolean =>
  new Set(access.spaces.map((grant) => grant.spaceId)).size === access.spaces.length;

const grantsSomething = (access: AccessTokenAccess): boolean => access.allSpaces.length > 0 || access.spaces.length > 0;

/**
 * Lo que un token tiene dado, tal como se acepta al crearlo o cambiarlo, y tal
 * como se vuelve a leer de la base. Se valida la forma aquí; que el dueño pueda
 * dar esos permisos en esos espacios lo decide el servidor, que es quien sabe
 * qué ve el dueño.
 */
export const accessTokenAccessSchema = z
  .object({
    allSpaces: permissionListSchema,
    spaces: z.array(spaceGrantSchema).max(ACCESS_TOKEN_SPACE_GRANT_LIMIT),
  })
  .refine(namesEachSpaceOnce)
  .refine(grantsSomething);
