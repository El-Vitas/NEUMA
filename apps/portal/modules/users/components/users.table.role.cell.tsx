'use client';

import type { TableCellProps } from '@/shared/types/table.types';
import type { UserListItem } from '../types/users.types';
import { UsersRoleBadge } from './users.role.badge';

// Defined outside the table: an inline cell is a new component each render and remounts the row.
export const UsersTableRoleCell = ({ row }: TableCellProps<UserListItem>) => (
  <UsersRoleBadge role={row.original.role} />
);
