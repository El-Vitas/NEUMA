import type { User, UserRole } from '@company-brain/shared';
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
