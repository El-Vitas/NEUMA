import type { UserRole } from '@neuma/shared';

export interface UserListItem {
  createdAt: Date;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  role: UserRole;
}

export interface FirstAdminArguments {
  readonly email: string;
  readonly name: string;
}

export interface NewAccount {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly role: UserRole;
}

export interface UserListResult {
  items: UserListItem[];
  page: number;
  pageSize: number;
  total: number;
}
