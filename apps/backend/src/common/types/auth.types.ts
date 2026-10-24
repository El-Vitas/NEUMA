import type { User, UserRole } from '@neuma/shared';
import type { Action, Resource } from '../constants/permission.constants';

export interface PermissionEntry {
  action: Action;
  resource: Resource;
}

export interface AuthUserRow {
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  password: string;
  role: UserRole;
  tokenVersion: number;
}

export interface RequestUser {
  data: null | User;
  readonly payload: TokenPayload;
}

export interface TokenPayload {
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  /** The refresh-token family of the login this access token came from. */
  readonly sid: string;
  readonly sub: string;
}

/** A refresh token renews only while its version matches the account's `tokenVersion` and its row is unspent. */
export interface RefreshTokenPayload extends Omit<TokenPayload, 'sid'> {
  /** Id of the `RefreshSession` row. */
  readonly jti: string;
  readonly ver: number;
}
