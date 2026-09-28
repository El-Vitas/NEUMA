import type {
  ACCESS_TOKEN_LEVEL_PERMISSIONS,
  ACCESS_TOKEN_LEVEL_VALUES,
  ACCESS_TOKEN_PERMISSION_VALUES,
} from './access-token.definitions.js';

export type AccessTokenPermission = (typeof ACCESS_TOKEN_PERMISSION_VALUES)[number];

export type AccessTokenLevel = (typeof ACCESS_TOKEN_LEVEL_VALUES)[number];

/** Un nivel que sí dice qué permisos trae: todos menos «personalizado», que es la falta de uno. */
export type AccessTokenPresetLevel = keyof typeof ACCESS_TOKEN_LEVEL_PERMISSIONS;

/** Lo que un token puede hacer en un espacio concreto. Sin permisos, el espacio queda excluido. */
export interface AccessTokenSpaceGrant {
  readonly permissions: readonly AccessTokenPermission[];
  readonly spaceId: string;
}

/**
 * Lo que un token puede hacer en una página y en todo lo que cuelga de ella.
 * Sin permisos, esa página y lo que cuelga de ella quedan excluidos.
 */
export interface AccessTokenPageGrant {
  readonly pageId: string;
  readonly permissions: readonly AccessTokenPermission[];
}

/**
 * Todo lo que un token tiene dado, como reglas por lugar: en todos los
 * espacios, en un espacio, en una página. Para cada página manda la regla más
 * cercana, subiendo desde la página hacia su espacio y después a todos.
 */
export interface AccessTokenAccess {
  readonly allSpaces: readonly AccessTokenPermission[];
  readonly pages: readonly AccessTokenPageGrant[];
  readonly spaces: readonly AccessTokenSpaceGrant[];
}

/**
 * Dónde está algo, dicho como hace falta para decidir: su espacio y la
 * cadena de páginas desde la más cercana hasta la raíz. Un lugar del espacio
 * que no es una página lleva la cadena vacía.
 */
export interface AccessTokenPlace {
  readonly lineage: readonly string[];
  readonly spaceId: string;
}
