'use client';

import type { TableCellProps } from '@/shared/types/table.types';
import type { UserListItem } from '../types/users.types';
import { UsersEditDialog } from './users.edit.dialog';

/** What can be done to the user a row stands for. */
export const UsersTableActionsCell = ({ row }: TableCellProps<UserListItem>) => <UsersEditDialog user={row.original} />;
