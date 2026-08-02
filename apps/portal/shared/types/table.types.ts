import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table';
import type React from 'react';

export interface TableAction {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void | Promise<void>;
  destructive?: boolean;
}

export interface BuildTableUrlOptions {
  readonly baseUrl: string;
  readonly filterParamMap?: Record<string, string>;
  readonly sortFieldMap?: Record<string, string>;
}

export interface BuildTableUrlParams {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

export interface UseEntityTableOptions<TData> {
  readonly buildUrl: (params: BuildTableUrlParams) => string;
  readonly columns: ColumnDef<TData, unknown>[];
  readonly data: TData[];
  readonly initialState?: {
    readonly columnFilters?: ColumnFiltersState;
    readonly sorting?: SortingState;
  };
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface EntityTableExportHandlers {
  readonly onExportCsv?: () => void;
  readonly onExportPdf?: () => void | Promise<void>;
  readonly isExportingPdf?: boolean;
}
