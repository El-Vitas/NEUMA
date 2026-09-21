import {
  type AccessTokenAccess,
  type AccessTokenPermission,
  accessTokenAccessSchema,
  canRoleGrantAccessTokenPermission,
  listAccessTokenGrantedPermissions,
  Result,
  type UserRole,
} from '@company-brain/shared';
import type { AccessTokenValidity } from './access-token.domain.types';
import { AccessTokenAccessValidationError } from './access-token.error';

/** Un token sirve mientras no lo hayan revocado y no haya vencido. */
export const isAccessTokenUsable = (token: AccessTokenValidity, now: Date): boolean =>
  token.revokedAt === null && (token.expiresAt === null || token.expiresAt > now);

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
 * Los permisos pedidos que su dueño no podría usar él mismo.
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
