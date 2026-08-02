import type { ColumnFiltersState, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';

export interface UseTableSyncOptions {
  readonly columnFilters: ColumnFiltersState;
  readonly filtersKey: string;
  readonly page: number;
  readonly pageSize: number;
  readonly sorting: SortingState;
  readonly buildUrl: (params: {
    readonly pageIndex: number;
    readonly pageSize: number;
    readonly sorting: SortingState;
    readonly columnFilters: ColumnFiltersState;
  }) => string;
  readonly debounceMs?: number;
}

export interface UseTableSyncResult {
  readonly localColumnFilters: ColumnFiltersState;
  readonly isLoading: boolean;
  readonly onPaginationChange: OnChangeFn<PaginationState>;
  readonly onSortingChange: OnChangeFn<SortingState>;
  readonly onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
}
