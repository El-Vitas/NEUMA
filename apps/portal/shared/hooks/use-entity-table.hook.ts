import type { RowData, Table as TanstackTable } from '@tanstack/react-table';
import { useDataTable } from '@/shared/hooks/use-data-table';
import { useTableSync } from '@/shared/hooks/use-table-sync';
import type { DataTableFeatures, EntityTableExportHandlers, UseEntityTableOptions } from '@/shared/types/table.types';

export const useNoOpExportHandlers = <TData extends RowData>(
  _table: TanstackTable<DataTableFeatures, TData>,
): EntityTableExportHandlers => ({});

export const useEntityTable = <TData extends RowData>({
  data,
  total,
  page,
  pageSize,
  columns,
  buildUrl,
  initialState,
}: UseEntityTableOptions<TData>) => {
  const sorting = initialState?.sorting ?? [];
  const columnFilters = initialState?.columnFilters ?? [];

  const filtersKey = columnFilters.map((f) => `${f.id}=${String(f.value)}`).join('|');

  const sync = useTableSync({
    columnFilters,
    filtersKey,
    page,
    pageSize,
    sorting,
    buildUrl,
  });

  const pageCount = total > 0 && pageSize > 0 ? Math.ceil(total / pageSize) : 0;

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      pagination: { pageIndex: page - 1, pageSize },
      sorting,
      columnFilters: sync.localColumnFilters,
    },
    enableAdvancedFilter: false,
    debounceMs: 300,
    shallow: false,
    onPaginationChange: sync.onPaginationChange,
    onSortingChange: sync.onSortingChange,
    onColumnFiltersChange: sync.onColumnFiltersChange,
  });

  return {
    table,
    isLoading: sync.isLoading,
  };
};
