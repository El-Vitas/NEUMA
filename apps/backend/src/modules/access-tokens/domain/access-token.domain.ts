import {
  type AccessTokenAccess,
  type AccessTokenPermission,
  accessTokenAccessSchema,
  canRoleGrantAccessTokenPermission,
  isAccessTokenNameAcceptable,
  listAccessTokenGrantedPermissions,
  Result,
  type UserRole,
} from '@company-brain/shared';
import type { AccessTokenValidity } from './access-token.domain.types';
import {
  AccessTokenAccessValidationError,
  AccessTokenExpiryInPastError,
  AccessTokenNameInvalidError,
} from './access-token.error';

/** Un token sirve mientras no lo hayan revocado y no haya vencido. En el instante en que vence ya no sirve. */
export const isAccessTokenUsable = (token: AccessTokenValidity, now: Date): boolean =>
  token.revokedAt === null && (token.expiresAt === null || token.expiresAt > now);

/** El nombre de un token, sin los espacios de los bordes, o por qué no sirve. */
export const validateAccessTokenName = (raw: string): Result<string, AccessTokenNameInvalidError> => {
  const name = raw.trim();
  return isAccessTokenNameAcceptable(name) ? Result.ok(name) : Result.fail(new AccessTokenNameInvalidError());
};

/** Hasta cuándo sirve: nunca, o un momento después de ahora. Una fecha inválida no es una fecha. */
export const validateAccessTokenExpiry = (
  expiresAt: Date | null,
  now: Date,
): Result<Date | null, AccessTokenExpiryInPastError> => {
  if (expiresAt === null) return Result.ok(null);
  const isLater = !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
  return isLater ? Result.ok(expiresAt) : Result.fail(new AccessTokenExpiryInPastError());
};

/** Lo que se pide dar, con la forma que el catálogo acepta, o por qué no. */
export const validateAccessTokenAccess = (
  access: unknown,
): Result<AccessTokenAccess, AccessTokenAccessValidationError> => {
  const validation = accessTokenAccessSchema.safeParse(access);
  return validation.success
    ? Result.ok(validation.data)
    : Result.fail(new AccessTokenAccessValidationError(validation.error.issues));
};

/**
 * Los permisos pedidos que su dueño no podría usar él mismo, en cualquier
 * lugar: todos los espacios, un espacio o una página.
 *
 * Un token nunca da más que su dueño. Se devuelven por nombre para que el
 * rechazo diga cuáles sobran, no solo que algo sobra.
 */
export const listPermissionsBeyondRole = (
  access: AccessTokenAccess,
  role: UserRole,
): readonly AccessTokenPermission[] =>
  listAccessTokenGrantedPermissions(access).filter(
    (permission) => !canRoleGrantAccessTokenPermission(role, permission),
  );
