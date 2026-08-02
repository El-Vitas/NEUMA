import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

export interface UseDataTableOptions<TData> {
  readonly data: TData[];
  readonly columns: ColumnDef<TData>[];
  readonly pageCount?: number;
  readonly manualPagination?: boolean;
  readonly manualSorting?: boolean;
  readonly manualFiltering?: boolean;
  readonly initialState?: {
    readonly sorting?: SortingState;
    readonly pagination?: PaginationState;
    readonly columnFilters?: ColumnFiltersState;
    readonly columnVisibility?: VisibilityState;
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
