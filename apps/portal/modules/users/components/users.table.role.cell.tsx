'use client';

import type { TableCellProps } from '@/shared/types/table.types';
import type { UserListItem } from '../types/users.types';
import { UsersRoleBadge } from './users.role.badge';

/**
 * The role of the user a row stands for.
 *
 * It is written outside the table on purpose: a cell drawn from inside the
 * table would be a different component on every render, and the row would be
 * thrown away and built again with it.
 */
export const UsersTableRoleCell = ({ row }: TableCellProps<UserListItem>) => (
  <UsersRoleBadge role={row.original.role} />
);
