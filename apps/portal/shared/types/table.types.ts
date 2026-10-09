import type { CellContext, ColumnDef, ColumnFiltersState, RowData, SortingState } from '@tanstack/react-table';
import type React from 'react';
import type { dataTableFeatures } from '@/shared/lib/data-table.features.lib';

export type DataTableFeatures = typeof dataTableFeatures;

/** Keeps the table library behind `shared/`, so module cells never import it. */
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
