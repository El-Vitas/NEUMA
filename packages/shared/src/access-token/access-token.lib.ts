import { canEditContent } from '../types/workspace.types.js';
import type { UserRole } from '../types/user-role.types.js';
import {
  ACCESS_TOKEN_LEVEL_PERMISSIONS,
  ACCESS_TOKEN_LEVELS,
  ACCESS_TOKEN_NAME_CONTROL_CHARACTERS,
  ACCESS_TOKEN_NAME_MAX_LENGTH,
  ACCESS_TOKEN_NAME_WHITESPACE_RUN,
  ACCESS_TOKEN_PRESET_LEVELS,
  ACCESS_TOKEN_WRITE_PERMISSIONS,
} from './access-token.definitions.js';
import type {
  AccessTokenAccess,
  AccessTokenLevel,
  AccessTokenPageGrant,
  AccessTokenPermission,
  AccessTokenPlace,
  AccessTokenPresetLevel,
} from './access-token.types.js';

const isWritePermission = (permission: AccessTokenPermission): boolean =>
  ACCESS_TOKEN_WRITE_PERMISSIONS.some((writing) => writing === permission);

export const listAccessTokenLevelPermissions = (level: AccessTokenPresetLevel): readonly AccessTokenPermission[] =>
  ACCESS_TOKEN_LEVEL_PERMISSIONS[level];

const holdsExactly = (held: ReadonlySet<AccessTokenPermission>, level: AccessTokenPresetLevel): boolean => {
  const expected = listAccessTokenLevelPermissions(level);
  return expected.length === held.size && expected.every((permission) => held.has(permission));
};

/** El nombre del nivel que calza con estos permisos, sin importar el orden, o «personalizado» si ninguno calza. */
export const readAccessTokenLevel = (permissions: readonly AccessTokenPermission[]): AccessTokenLevel => {
  const held = new Set(permissions);
  return ACCESS_TOKEN_PRESET_LEVELS.find((level) => holdsExactly(held, level)) ?? ACCESS_TOKEN_LEVELS.custom;
};

/**
 * Si alguien con este rol puede poner este permiso en un token.
 *
 * Un token nunca da más que su dueño: quien solo puede leer no fabrica una
 * llave que escriba por él.
 */
export const canRoleGrantAccessTokenPermission = (role: UserRole, permission: AccessTokenPermission): boolean =>
  !isWritePermission(permission) || canEditContent(role);

/** La regla de página más cercana: la de la página misma o la del primer ancestro que tenga una. */
const findClosestPageGrant = (
  access: AccessTokenAccess,
  lineage: readonly string[],
): AccessTokenPageGrant | undefined =>
  lineage
    .map((pageId) => access.pages.find((grant) => grant.pageId === pageId))
    .find((grant): grant is AccessTokenPageGrant => grant !== undefined);

/**
 * Lo que el token tiene dado en un lugar: lo que diga la regla más cercana.
 *
 * Se sube desde la página por sus ancestros; si ninguno tiene regla, manda la
 * del espacio, y si tampoco, la de todos los espacios. La primera que aparece
 * decide sola, sin sumarse a las de arriba: por eso una regla sin permisos
 * excluye, y una más adentro puede volver a abrir o achicar.
 */
export const readAccessTokenPermissionsAt = (
  access: AccessTokenAccess,
  place: AccessTokenPlace,
): readonly AccessTokenPermission[] =>
  findClosestPageGrant(access, place.lineage)?.permissions ??
  access.spaces.find((grant) => grant.spaceId === place.spaceId)?.permissions ??
  access.allSpaces;

/**
 * Si el token puede hacer esto en este lugar, hoy.
 *
 * Hacen falta las dos cosas: que la regla más cercana lo dé, y que su dueño
 * todavía pueda hacerlo. El rol del dueño es el de ahora, no el que tenía al
 * crearlo. Que el dueño siga viendo el lugar lo decide aparte cada lectura,
 * con la misma regla de visibilidad de la pantalla.
 */
export const canAccessTokenAct = (
  access: AccessTokenAccess,
  ownerRole: UserRole,
  place: AccessTokenPlace,
  permission: AccessTokenPermission,
): boolean =>
  readAccessTokenPermissionsAt(access, place).includes(permission) &&
  canRoleGrantAccessTokenPermission(ownerRole, permission);

/** Cada permiso que el token tiene en algún lugar: lo que decide qué herramientas se le ofrecen al agente. */
export const listAccessTokenGrantedPermissions = (access: AccessTokenAccess): readonly AccessTokenPermission[] => [
  ...new Set([
    ...access.allSpaces,
    ...access.spaces.flatMap((grant) => grant.permissions),
    ...access.pages.flatMap((grant) => grant.permissions),
  ]),
];

/**
 * Si un nombre, ya sin los espacios de los bordes, sirve: dice algo, cabe en
 * la lista y no trae caracteres de control, que desordenan la lista y los
 * registros donde aparece.
 */
export const isAccessTokenNameAcceptable = (trimmedName: string): boolean =>
  trimmedName.length > 0 &&
  trimmedName.length <= ACCESS_TOKEN_NAME_MAX_LENGTH &&
  !ACCESS_TOKEN_NAME_CONTROL_CHARACTERS.test(trimmedName);

/** Cómo se compara un nombre con otro: sin mayúsculas y con una sola separación entre palabras. */
const normalizeAccessTokenName = (name: string): string =>
  name.trim().replaceAll(ACCESS_TOKEN_NAME_WHITESPACE_RUN, ' ').toLocaleLowerCase();

/**
 * Si el nombre ya lo usa otro token vivo de la misma persona. Dos tokens que
 * se leen igual en la lista se confunden al revocar uno de ellos.
 */
export const isAccessTokenNameTaken = (name: string, liveNames: readonly string[]): boolean => {
  const wanted = normalizeAccessTokenName(name);
  return liveNames.some((liveName) => normalizeAccessTokenName(liveName) === wanted);
};

/** Si alguna regla da algo. Un token hecho solo de exclusiones no abre nada. */
export const hasAccessTokenAnyPermission = (access: AccessTokenAccess): boolean =>
  listAccessTokenGrantedPermissions(access).length > 0;
