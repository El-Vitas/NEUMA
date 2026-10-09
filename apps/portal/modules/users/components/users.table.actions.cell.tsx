'use client';

import type { TableCellProps } from '@/shared/types/table.types';
import type { UserListItem } from '../types/users.types';
import { UsersEditDialog } from './users.edit.dialog';

export const UsersTableActionsCell = ({ row }: TableCellProps<UserListItem>) => <UsersEditDialog user={row.original} />;
