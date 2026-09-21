import {
  ACCESS_TOKEN_LEVEL_VALUES,
  ACCESS_TOKEN_LEVELS,
  ACCESS_TOKEN_PERMISSION_VALUES,
  type AccessTokenAccess,
  type AccessTokenLevel,
  type AccessTokenPermission,
  canRoleGrantAccessTokenPermission,
  listAccessTokenLevelPermissions,
  MILLISECONDS_IN_A_DAY,
  readAccessTokenLevel,
  type UserRole,
} from '@company-brain/shared';
import {
  ACCESS_TOKEN_ALL_SPACES,
  ACCESS_TOKEN_EXPIRY_DAYS,
  ACCESS_TOKEN_EXPIRY_OPTIONS,
} from '../constants/access-tokens.constants';
import type { AccessToken, AccessTokenDraftRow, AccessTokenExpiry } from '../types/access-tokens.types';

/** El día en que vence un token con la opción elegida, o nada si no vence. */
export const readAccessTokenExpiry = (expiry: AccessTokenExpiry, now: Date): Date | null =>
  expiry === ACCESS_TOKEN_EXPIRY_OPTIONS.never
    ? null
    : new Date(now.getTime() + ACCESS_TOKEN_EXPIRY_DAYS[expiry] * MILLISECONDS_IN_A_DAY);

/** Los permisos que da una fila: los del nivel, o los marcados a mano si es personalizado. */
export const readDraftRowPermissions = (row: AccessTokenDraftRow): readonly AccessTokenPermission[] =>
  row.level === ACCESS_TOKEN_LEVELS.custom ? row.customPermissions : listAccessTokenLevelPermissions(row.level);

/** Lo que se manda al servidor a partir de las filas del formulario. */
export const draftRowsToAccess = (rows: readonly AccessTokenDraftRow[]): AccessTokenAccess => ({
  allSpaces: [
    ...new Set(rows.filter((row) => row.target === ACCESS_TOKEN_ALL_SPACES).flatMap(readDraftRowPermissions)),
  ],
  spaces: rows
    .filter((row) => row.target !== ACCESS_TOKEN_ALL_SPACES)
    .map((row) => ({ permissions: readDraftRowPermissions(row), spaceId: row.target })),
});

const toDraftRow = (target: string, permissions: readonly AccessTokenPermission[]): AccessTokenDraftRow => {
  const level = readAccessTokenLevel(permissions);
  return { customPermissions: level === ACCESS_TOKEN_LEVELS.custom ? permissions : [], key: target, level, target };
};

/** Las filas que muestran lo que un token ya tiene dado, para cambiarlo. */
export const accessToDraftRows = (
  access: Pick<AccessToken, 'allSpaces' | 'spaces'>,
): readonly AccessTokenDraftRow[] => [
  ...(access.allSpaces.length > 0 ? [toDraftRow(ACCESS_TOKEN_ALL_SPACES, access.allSpaces)] : []),
  ...access.spaces.map((grant) => toDraftRow(grant.spaceId, grant.permissions)),
];

/** Los permisos que alguien con este rol puede poner en un token: los demás ni se ofrecen. */
export const listGrantablePermissions = (role: UserRole): readonly AccessTokenPermission[] =>
  ACCESS_TOKEN_PERMISSION_VALUES.filter((permission) => canRoleGrantAccessTokenPermission(role, permission));

const isLevelGrantable = (role: UserRole, level: AccessTokenLevel): boolean =>
  level === ACCESS_TOKEN_LEVELS.custom ||
  listAccessTokenLevelPermissions(level).every((permission) => canRoleGrantAccessTokenPermission(role, permission));

/** Los niveles que alguien con este rol puede dar entero. Personalizado siempre, con las casillas que le tocan. */
export const listGrantableLevels = (role: UserRole): readonly AccessTokenLevel[] =>
  ACCESS_TOKEN_LEVEL_VALUES.filter((level) => isLevelGrantable(role, level));

const namesEachPlaceOnce = (rows: readonly AccessTokenDraftRow[]): boolean =>
  new Set(rows.map((row) => row.target)).size === rows.length;

/** Si el formulario dice algo que se pueda mandar: algún permiso, y cada lugar una sola vez. */
export const canSubmitAccessDraft = (rows: readonly AccessTokenDraftRow[]): boolean =>
  rows.length > 0 && namesEachPlaceOnce(rows) && rows.every((row) => readDraftRowPermissions(row).length > 0);
