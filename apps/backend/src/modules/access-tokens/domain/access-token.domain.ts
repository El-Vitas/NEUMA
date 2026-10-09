import {
  type AccessTokenAccess,
  type AccessTokenPermission,
  accessTokenAccessSchema,
  canRoleGrantAccessTokenPermission,
  isAccessTokenNameAcceptable,
  listAccessTokenGrantedPermissions,
  Result,
  type UserRole,
} from '@neuma/shared';
import type { AccessTokenValidity } from './access-token.domain.types';
import {
  AccessTokenAccessValidationError,
  AccessTokenExpiryInPastError,
  AccessTokenNameInvalidError,
} from './access-token.error';

/** A token expires at the exact instant of `expiresAt`. */
export const isAccessTokenUsable = (token: AccessTokenValidity, now: Date): boolean =>
  token.revokedAt === null && (token.expiresAt === null || token.expiresAt > now);

export const validateAccessTokenName = (raw: string): Result<string, AccessTokenNameInvalidError> => {
  const name = raw.trim();
  return isAccessTokenNameAcceptable(name) ? Result.ok(name) : Result.fail(new AccessTokenNameInvalidError());
};

export const validateAccessTokenExpiry = (
  expiresAt: Date | null,
  now: Date,
): Result<Date | null, AccessTokenExpiryInPastError> => {
  if (expiresAt === null) return Result.ok(null);
  const isLater = !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
  return isLater ? Result.ok(expiresAt) : Result.fail(new AccessTokenExpiryInPastError());
};

export const validateAccessTokenAccess = (
  access: unknown,
): Result<AccessTokenAccess, AccessTokenAccessValidationError> => {
  const validation = accessTokenAccessSchema.safeParse(access);
  return validation.success
    ? Result.ok(validation.data)
    : Result.fail(new AccessTokenAccessValidationError(validation.error.issues));
};

/** A token never grants more than its owner; returned by name so the refusal says which permissions are too many. */
export const listPermissionsBeyondRole = (
  access: AccessTokenAccess,
  role: UserRole,
): readonly AccessTokenPermission[] =>
  listAccessTokenGrantedPermissions(access).filter(
    (permission) => !canRoleGrantAccessTokenPermission(role, permission),
  );
