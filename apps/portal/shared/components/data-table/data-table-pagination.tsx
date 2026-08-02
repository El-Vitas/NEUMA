import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps<TData> extends React.ComponentProps<'div'> {
  readonly table: Table<TData>;
  readonly pageSizeOptions?: number[];
  readonly totalCount?: number;
}

export const DataTablePagination = <TData,>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  totalCount,
  className,
  ...props
}: Readonly<DataTablePaginationProps<TData>>) => {
  const { pageIndex, pageSize } = table.getState().pagination;
  const rangeStart = pageIndex * pageSize + 1;
  const rangeEnd =
    totalCount === undefined ? rangeStart + pageSize - 1 : Math.min(rangeStart + pageSize - 1, totalCount);

  return (
    <div
      className={cn('flex flex-col gap-3 px-1 py-2 sm:flex-row sm:items-center sm:justify-between', className)}
      {...props}
    >
      <div className="flex items-center gap-3 whitespace-nowrap text-muted-foreground text-sm">
        {totalCount !== undefined && totalCount > 0 && (
          <span>
            {rangeStart}–{rangeEnd} de {totalCount} resultado{totalCount === 1 ? '' : 's'}
          </span>
        )}
        {totalCount === 0 && <span>0 resultados</span>}
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span>
            {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} fila(s)
            seleccionada(s).
          </span>
        )}
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
            value={`${table.getState().pagination.pageSize}`}
          >
            <SelectTrigger className="h-8 rounded-none border text-foreground">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center font-medium text-foreground text-sm">
          {table.getPageCount() === 0 ? 0 : table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Ir a la primera página"
            className="hidden size-8 rounded-none text-foreground lg:flex"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
            size="icon"
            variant="outline"
          >
            <ChevronsLeft />
          </Button>
          <Button
            aria-label="Ir a la página anterior"
            className="size-8 rounded-none text-foreground"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            size="icon"
            variant="outline"
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label="Ir a la siguiente página"
            className="size-8 rounded-none text-foreground"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            size="icon"
            variant="outline"
          >
            <ChevronRight />
          </Button>
          <Button
            aria-label="Ir a la última página"
            className="hidden size-8 rounded-none text-foreground lg:flex"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            size="icon"
            variant="outline"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
};
