import { canEditContent } from '../types/workspace.types.js';
import type { UserRole } from '../types/user-role.types.js';
import {
  ACCESS_TOKEN_LEVEL_PERMISSIONS,
  ACCESS_TOKEN_LEVELS,
  ACCESS_TOKEN_PRESET_LEVELS,
  ACCESS_TOKEN_WRITE_PERMISSIONS,
} from './access-token.definitions.js';
import type {
  AccessTokenAccess,
  AccessTokenLevel,
  AccessTokenPermission,
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

/** Lo que el token puede hacer en un espacio: lo que tiene en todos, sumado a lo que tiene en ese. */
export const readAccessTokenSpacePermissions = (
  access: AccessTokenAccess,
  spaceId: string,
): readonly AccessTokenPermission[] => {
  const inThatSpace = access.spaces.find((grant) => grant.spaceId === spaceId)?.permissions ?? [];
  return [...new Set([...access.allSpaces, ...inThatSpace])];
};

/**
 * Si el token puede hacer esto en este espacio, hoy.
 *
 * Hacen falta las dos cosas: que el token lo tenga dado, y que su dueño todavía
 * pueda hacerlo. El rol del dueño es el de ahora, no el que tenía al crearlo.
 * Que el dueño siga viendo el espacio lo decide aparte cada lectura, con la
 * misma regla de visibilidad de la pantalla.
 */
export const canAccessTokenAct = (
  access: AccessTokenAccess,
  ownerRole: UserRole,
  spaceId: string,
  permission: AccessTokenPermission,
): boolean =>
  readAccessTokenSpacePermissions(access, spaceId).includes(permission) &&
  canRoleGrantAccessTokenPermission(ownerRole, permission);

/** Cada permiso que el token tiene en algún espacio: lo que decide qué herramientas se le ofrecen al agente. */
export const listAccessTokenGrantedPermissions = (access: AccessTokenAccess): readonly AccessTokenPermission[] => [
  ...new Set([...access.allSpaces, ...access.spaces.flatMap((grant) => grant.permissions)]),
];
