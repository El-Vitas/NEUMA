import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnVisibilityState,
  OnChangeFn,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import type { DataTableFeatures } from '@/shared/types/table.types';

export interface UseDataTableOptions<TData extends RowData> {
  readonly data: TData[];
  readonly columns: ColumnDef<DataTableFeatures, TData, unknown>[];
  readonly pageCount?: number;
  readonly manualPagination?: boolean;
  readonly manualSorting?: boolean;
  readonly manualFiltering?: boolean;
  readonly initialState?: {
    readonly sorting?: SortingState;
    readonly pagination?: PaginationState;
    readonly columnFilters?: ColumnFiltersState;
    readonly columnVisibility?: ColumnVisibilityState;
    readonly rowSelection?: RowSelectionState;
  };
  readonly state?: {
    readonly pagination?: PaginationState;
    readonly sorting?: SortingState;
    readonly columnFilters?: ColumnFiltersState;
  };
  readonly enableAdvancedFilter?: boolean;
  readonly debounceMs?: number;
  readonly shallow?: boolean;
  readonly onPaginationChange?: OnChangeFn<PaginationState>;
  readonly onSortingChange?: OnChangeFn<SortingState>;
  readonly onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
}
