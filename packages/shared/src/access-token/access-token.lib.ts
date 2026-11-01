import type { UserRole } from '../types/user-role.types.js';
import { canEditContent } from '../types/workspace.types.js';
import { isOneOf } from '../value-list.lib.js';
import {
  ACCESS_TOKEN_LEVEL_PERMISSIONS,
  ACCESS_TOKEN_LEVELS,
  ACCESS_TOKEN_NAME_CONTROL_CHARACTERS,
  ACCESS_TOKEN_NAME_MAX_LENGTH,
  ACCESS_TOKEN_NAME_WHITESPACE_RUN,
  ACCESS_TOKEN_PRESET_LEVELS,
  ACCESS_TOKEN_READ_PERMISSIONS,
} from './access-token.definitions.js';
import type {
  AccessTokenAccess,
  AccessTokenLevel,
  AccessTokenPageGrant,
  AccessTokenPermission,
  AccessTokenPlace,
  AccessTokenPresetLevel,
} from './access-token.types.js';

/** Anything not in the read list counts as a write, even a permission nobody classified. */
const isReadOnlyPermission = (permission: AccessTokenPermission): boolean =>
  isOneOf(ACCESS_TOKEN_READ_PERMISSIONS, permission);

export const listAccessTokenLevelPermissions = (level: AccessTokenPresetLevel): readonly AccessTokenPermission[] =>
  ACCESS_TOKEN_LEVEL_PERMISSIONS[level];

const holdsExactly = (held: ReadonlySet<AccessTokenPermission>, level: AccessTokenPresetLevel): boolean => {
  const expected = listAccessTokenLevelPermissions(level);
  return expected.length === held.size && expected.every((permission) => held.has(permission));
};

/** Order-insensitive match against the preset levels; `custom` when none matches. */
export const readAccessTokenLevel = (permissions: readonly AccessTokenPermission[]): AccessTokenLevel => {
  const held = new Set(permissions);
  return ACCESS_TOKEN_PRESET_LEVELS.find((level) => holdsExactly(held, level)) ?? ACCESS_TOKEN_LEVELS.custom;
};

/** A token never grants more than its owner can do: a read-only role can only grant read permissions. */
export const canRoleGrantAccessTokenPermission = (role: UserRole, permission: AccessTokenPermission): boolean =>
  isReadOnlyPermission(permission) || canEditContent(role);

const findClosestPageGrant = (
  access: AccessTokenAccess,
  lineage: readonly string[],
): AccessTokenPageGrant | undefined =>
  lineage
    .map((pageId) => access.pages.find((grant) => grant.pageId === pageId))
    .find((grant): grant is AccessTokenPageGrant => grant !== undefined);

/**
 * The nearest rule decides alone, without adding up the ones above: page ancestors
 * first, then the space, then all spaces. So an empty rule excludes, and a deeper
 * rule can reopen or narrow access.
 */
export const readAccessTokenPermissionsAt = (
  access: AccessTokenAccess,
  place: AccessTokenPlace,
): readonly AccessTokenPermission[] =>
  findClosestPageGrant(access, place.lineage)?.permissions ??
  access.spaces.find((grant) => grant.spaceId === place.spaceId)?.permissions ??
  access.allSpaces;

/**
 * Needs both the nearest rule and the owner's current role (not the one at creation).
 * Whether the owner still sees the place is decided separately on each read.
 */
export const canAccessTokenAct = (
  access: AccessTokenAccess,
  ownerRole: UserRole,
  place: AccessTokenPlace,
  permission: AccessTokenPermission,
): boolean =>
  readAccessTokenPermissionsAt(access, place).includes(permission) &&
  canRoleGrantAccessTokenPermission(ownerRole, permission);

/** Decides which tools the agent is offered. */
export const listAccessTokenGrantedPermissions = (access: AccessTokenAccess): readonly AccessTokenPermission[] => [
  ...new Set([
    ...access.allSpaces,
    ...access.spaces.flatMap((grant) => grant.permissions),
    ...access.pages.flatMap((grant) => grant.permissions),
  ]),
];

/** Control characters are rejected because they garble the list and the records where the name appears. */
export const isAccessTokenNameAcceptable = (trimmedName: string): boolean =>
  trimmedName.length > 0 &&
  trimmedName.length <= ACCESS_TOKEN_NAME_MAX_LENGTH &&
  !ACCESS_TOKEN_NAME_CONTROL_CHARACTERS.test(trimmedName);

const normalizeAccessTokenName = (name: string): string =>
  name.trim().replaceAll(ACCESS_TOKEN_NAME_WHITESPACE_RUN, ' ').toLowerCase();

/** Two tokens that read the same in the list get confused when revoking one. */
export const isAccessTokenNameTaken = (name: string, liveNames: readonly string[]): boolean => {
  const wanted = normalizeAccessTokenName(name);
  return liveNames.some((liveName) => normalizeAccessTokenName(liveName) === wanted);
};

export const hasAccessTokenAnyPermission = (access: AccessTokenAccess): boolean =>
  listAccessTokenGrantedPermissions(access).length > 0;
