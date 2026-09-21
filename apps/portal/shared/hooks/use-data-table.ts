'use client';

import type { ColumnFiltersState, OnChangeFn, PaginationState, RowData, SortingState } from '@tanstack/react-table';
import { useTable } from '@tanstack/react-table';
import { useCallback } from 'react';
import { dataTableFeatures } from '@/shared/lib/data-table.features.lib';
import type { UseDataTableOptions } from './types/use-data-table.types';

export const useDataTable = <TData extends RowData>({
  data,
  columns,
  pageCount,
  manualPagination = true,
  manualSorting = true,
  manualFiltering = true,
  initialState,
  state,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
}: UseDataTableOptions<TData>) => {
  const handlePaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updaterOrValue) => {
      onPaginationChange?.(updaterOrValue);
    },
    [onPaginationChange],
  );

  const handleSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updaterOrValue) => {
      onSortingChange?.(updaterOrValue);
    },
    [onSortingChange],
  );

  const handleColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    (updaterOrValue) => {
      onColumnFiltersChange?.(updaterOrValue);
    },
    [onColumnFiltersChange],
  );

  const table = useTable({
    features: dataTableFeatures,
    data: data ?? [],
    columns,
    pageCount,
    manualPagination,
    manualSorting,
    manualFiltering,
    initialState: {
      ...(initialState?.sorting && { sorting: initialState.sorting }),
      ...(initialState?.pagination && { pagination: initialState.pagination }),
      ...(initialState?.columnFilters && {
        columnFilters: initialState.columnFilters,
      }),
      ...(initialState?.columnVisibility && {
        columnVisibility: initialState.columnVisibility,
      }),
      ...(initialState?.rowSelection && {
        rowSelection: initialState.rowSelection,
      }),
    },
    state: {
      ...(state?.pagination !== undefined && { pagination: state.pagination }),
      ...(state?.sorting !== undefined && { sorting: state.sorting }),
      ...(state?.columnFilters !== undefined && {
        columnFilters: state.columnFilters,
      }),
    },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    enableRowSelection: true,
    enableMultiRowSelection: true,
  });

  return { table };
};
