import { USER_ROLE_VALUES, type User, type UserRole } from '@neuma/shared';
import { BEARER_AUTHORIZATION_PATTERN } from '../constants/auth.constants';
import { ADMIN_PERMISSIONS, WORKER_PERMISSIONS } from '../constants/role.permissions';
import type { PermissionEntry } from '../types/auth.types';

export const isUserRole = (value: string): value is UserRole => {
  return (USER_ROLE_VALUES as readonly string[]).includes(value);
};

export const getPermissionsForRole = (role: string): readonly PermissionEntry[] => {
  if (role === USER_ROLE_VALUES[0]) return ADMIN_PERMISSIONS;
  if (role === USER_ROLE_VALUES[1]) return WORKER_PERMISSIONS;
  return [];
};

/** Header only: a token in the URL leaks into access logs, referrers and browser history. */
export const readBearerToken = (authorization: string | undefined): string | undefined => {
  if (typeof authorization !== 'string') return undefined;
  return BEARER_AUTHORIZATION_PATTERN.exec(authorization)?.[1];
};

export const toUser = (row: { email: string; id: string; name: string; role: UserRole }): User => ({
  email: row.email,
  id: row.id,
  name: row.name,
  role: row.role,
});
