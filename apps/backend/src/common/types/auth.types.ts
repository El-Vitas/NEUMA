import type { User, UserRole } from '@neuma/shared';
import type { Action, Resource } from '../constants/permission.constants';

export type Role = UserRole;

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
  readonly sub: string;
}

/** A refresh token renews only while its version matches the account's `tokenVersion`. */
export interface RefreshTokenPayload extends TokenPayload {
  /** Absent on tokens issued before versions existed; those count as version 0. */
  readonly ver?: number;
}

export interface CollaborationTokenPayload {
  readonly [claim: string]: unknown;
  readonly aud: string;
  readonly mode: 'read' | 'write';
  readonly pageId: string;
  readonly purpose: string;
  readonly role: UserRole;
  readonly sub: string;
  readonly workspaceId: string;
}
