'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { EntityTable } from '@/shared/components/data-table/entity-table';
import { formatDate } from '@/shared/utils/formatters';
import { buildUsersInitialColumnFilters, buildUsersPageUrl } from '../lib/users.lib';
import type { UserListItem } from '../types/users.types';
import { UsersCreateDialog } from './users.create.dialog';
import { UsersTableActionsCell } from './users.table.actions.cell';
import { UsersTableRoleCell } from './users.table.role.cell';
import { UsersTableStatusCell } from './users.table.status.cell';

interface IProps {
  readonly items: UserListItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly search: string;
}

export const UsersTable = ({ items, page, pageSize, total, search }: IProps) => {
  const t = useTranslations('users');
  const locale = useLocale();
  const columns = useMemo<ColumnDef<UserListItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('name'),
        enableSorting: false,
        meta: { label: t('search'), placeholder: t('searchPlaceholder'), variant: 'text' },
      },
      {
        accessorKey: 'email',
        header: t('email'),
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        accessorKey: 'role',
        header: t('role'),
        enableColumnFilter: false,
        enableSorting: false,
        cell: UsersTableRoleCell,
      },
      {
        accessorKey: 'isActive',
        header: t('status'),
        enableColumnFilter: false,
        enableSorting: false,
        cell: UsersTableStatusCell,
      },
      {
        accessorKey: 'createdAt',
        header: t('created'),
        enableColumnFilter: false,
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.createdAt, { locale }),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableHiding: false,
        enableSorting: false,
        cell: UsersTableActionsCell,
      },
    ],
    [locale, t],
  );

  const initialState = useMemo(() => ({ columnFilters: buildUsersInitialColumnFilters(search) }), [search]);

  return (
    <EntityTable
      buildUrl={buildUsersPageUrl}
      columns={columns}
      data={items}
      emptyMessage={t('empty')}
      headerAction={<UsersCreateDialog />}
      initialState={initialState}
      page={page}
      pageSize={pageSize}
      subtitle={(count) => t('registeredCount', { count })}
      title={t('title')}
      total={total}
    />
  );
};
