'use client';

import type { TableCellProps } from '@/shared/types/table.types';
import type { UserListItem } from '../types/users.types';
import { UsersStatusBadge } from './users.status.badge';

/** Whether the user a row stands for can still get in. */
export const UsersTableStatusCell = ({ row }: TableCellProps<UserListItem>) => (
  <UsersStatusBadge isActive={row.original.isActive} />
);
