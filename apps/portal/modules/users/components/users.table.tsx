'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { EntityTable } from '@/shared/components/data-table/entity-table';
import { formatDate } from '@/shared/utils/formatters';
import { buildUsersInitialColumnFilters, buildUsersPageUrl, formatUsersSubtitle } from '../lib/users.lib';
import type { UserListItem } from '../types/users.types';
import { UsersCreateDialog } from './users.create.dialog';
import { UsersEditDialog } from './users.edit.dialog';
import { UsersRoleBadge } from './users.role.badge';
import { UsersStatusBadge } from './users.status.badge';

interface IProps {
  readonly items: UserListItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly search: string;
}

export const UsersTable = ({ items, page, pageSize, total, search }: IProps) => {
  const columns = useMemo<ColumnDef<UserListItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nombre',
        enableSorting: false,
        meta: { label: 'Buscar', placeholder: 'Nombre o email', variant: 'text' },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        accessorKey: 'role',
        header: 'Rol',
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => <UsersRoleBadge role={row.original.role} />,
      },
      {
        accessorKey: 'isActive',
        header: 'Estado',
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => <UsersStatusBadge isActive={row.original.isActive} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Creado',
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => <UsersEditDialog user={row.original} />,
      },
    ],
    [],
  );

  const initialState = useMemo(() => ({ columnFilters: buildUsersInitialColumnFilters(search) }), [search]);

  return (
    <EntityTable
      buildUrl={buildUsersPageUrl}
      columns={columns}
      data={items}
      emptyMessage="No hay usuarios registrados"
      headerAction={<UsersCreateDialog />}
      initialState={initialState}
      page={page}
      pageSize={pageSize}
      subtitle={formatUsersSubtitle}
      title="Usuarios"
      total={total}
    />
  );
};
