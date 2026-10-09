import type { UserRole } from '@neuma/shared';

export interface UserListItem {
  createdAt: Date;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  role: UserRole;
}

export interface UserListResult {
  items: UserListItem[];
  page: number;
  pageSize: number;
  total: number;
}
