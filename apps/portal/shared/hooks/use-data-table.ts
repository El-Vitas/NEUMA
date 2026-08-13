'use client';

import type { ColumnFiltersState, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback } from 'react';
import type { UseDataTableOptions } from './types/use-data-table.types';

export const useDataTable = <TData>({
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

  const table = useReactTable({
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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    getFacetedRowModel: manualFiltering ? undefined : getFacetedRowModel(),
    getFacetedUniqueValues: manualFiltering ? undefined : getFacetedUniqueValues(),
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    enableRowSelection: true,
    enableMultiRowSelection: true,
  });

  return { table };
};
