import type {
  ACCESS_TOKEN_LEVEL_PERMISSIONS,
  ACCESS_TOKEN_LEVEL_VALUES,
  ACCESS_TOKEN_PERMISSION_VALUES,
} from './access-token.definitions.js';

export type AccessTokenPermission = (typeof ACCESS_TOKEN_PERMISSION_VALUES)[number];

export type AccessTokenLevel = (typeof ACCESS_TOKEN_LEVEL_VALUES)[number];

/** Un nivel que sí dice qué permisos trae: todos menos «personalizado», que es la falta de uno. */
export type AccessTokenPresetLevel = keyof typeof ACCESS_TOKEN_LEVEL_PERMISSIONS;

/** Lo que un token puede hacer en un espacio concreto. */
export interface AccessTokenSpaceGrant {
  readonly permissions: readonly AccessTokenPermission[];
  readonly spaceId: string;
}

/**
 * Todo lo que un token tiene dado: lo que vale en todos los espacios de su
 * dueño, y lo que vale en cada espacio nombrado. En un espacio se suman las dos
 * cosas: «leer en todos» y «escribir en Producto» es leer en todos y además
 * escribir en Producto.
 */
export interface AccessTokenAccess {
  readonly allSpaces: readonly AccessTokenPermission[];
  readonly spaces: readonly AccessTokenSpaceGrant[];
}
