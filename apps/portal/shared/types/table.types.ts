import type { CellContext, ColumnDef, ColumnFiltersState, RowData, SortingState } from '@tanstack/react-table';
import type React from 'react';
import type { dataTableFeatures } from '@/shared/lib/data-table.features.lib';

/**
 * The set of capabilities every table type has to be told about.
 *
 * Taken from the one registry rather than written again, so the types and what
 * the tables can actually do cannot drift apart.
 */
export type DataTableFeatures = typeof dataTableFeatures;

/**
 * What a cell of our data table receives.
 *
 * Named here so a cell written inside a module speaks our table's language and
 * not the table library's — the library stays behind `shared/`.
 */
export type TableCellProps<TData extends RowData> = CellContext<DataTableFeatures, TData, unknown>;

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

export interface UseEntityTableOptions<TData extends RowData> {
  readonly buildUrl: (params: BuildTableUrlParams) => string;
  readonly columns: ColumnDef<DataTableFeatures, TData, unknown>[];
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
