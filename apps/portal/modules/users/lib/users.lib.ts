import type { ColumnFiltersState } from '@tanstack/react-table';
import { buildTableUrl } from '@/shared/lib/build-table-url.lib';
import { API_ROUTES, ROUTES } from '@/shared/routes/constants/routes.constants';
import type { BuildTableUrlParams } from '@/shared/types/table.types';
import { USERS_SEARCH_COLUMN_ID, USERS_SEARCH_PARAM } from '../constants/users.constants';
import { createUserSchema } from '../schemas/users.schemas';
import type { CreateUserInput, UsersListParams } from '../types/users.types';

export const buildUsersPageUrl = (params: BuildTableUrlParams): string =>
  buildTableUrl(params, {
    baseUrl: ROUTES.PORTAL_USERS,
    filterParamMap: { [USERS_SEARCH_COLUMN_ID]: USERS_SEARCH_PARAM },
  });

export const buildUsersApiEndpoint = ({ page, pageSize, search }: UsersListParams): string =>
  buildTableUrl(
    {
      pageIndex: page - 1,
      pageSize,
      sorting: [],
      columnFilters: search === '' ? [] : [{ id: USERS_SEARCH_PARAM, value: search }],
    },
    { baseUrl: API_ROUTES.USERS },
  );

export const buildUsersInitialColumnFilters = (search: string): ColumnFiltersState =>
  search === '' ? [] : [{ id: USERS_SEARCH_COLUMN_ID, value: search }];

export const formatUsersSubtitle = (total: number): string =>
  total === 1 ? '1 usuario registrado' : `${total} usuarios registrados`;

export const isCreateUserInputValid = (input: CreateUserInput): boolean => createUserSchema.safeParse(input).success;
