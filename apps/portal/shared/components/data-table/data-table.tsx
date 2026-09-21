import { flexRender, type RowData, type Table as TanstackTable } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import type * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getColumnPinningStyle } from '@/lib/data-table';
import { cn } from '@/lib/utils';
import { DataTableMobileView } from '@/shared/components/data-table/data-table-mobile-view';
import { DataTablePagination } from '@/shared/components/data-table/data-table-pagination';
import { getAriaSort, getEmptyMessage } from '@/shared/lib/data-table.lib';
import type { DataTableFeatures } from '@/shared/types/table.types';

export interface DataTableProps<TData extends RowData> extends React.ComponentProps<'div'> {
  readonly table: TanstackTable<DataTableFeatures, TData>;
  readonly actionBar?: React.ReactNode;
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
  readonly emptyMessageFiltered?: string;
  readonly emptyAction?: React.ReactNode;
  readonly totalCount?: number;
  readonly title?: string;
}

export const DataTable = <TData extends RowData>({
  table,
  actionBar,
  children,
  className,
  isLoading = false,
  emptyMessage,
  emptyMessageFiltered,
  emptyAction,
  totalCount,
  title,
  ...props
}: Readonly<DataTableProps<TData>>) => {
  const rowModel = table.getRowModel() ?? { rows: [] };
  const visibleColumns = table.getVisibleFlatColumns?.() ?? [];

  return (
    <div className={cn('flex w-full flex-col gap-3 overflow-auto', className)} {...props}>
      {children}

      <div className="hidden overflow-hidden border md:block">
        <div className="relative">
          <Table>
            {title && <caption className="sr-only">{title}</caption>}
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      aria-sort={header.column.getCanSort() ? getAriaSort(header.column.getIsSorted()) : undefined}
                      colSpan={header.colSpan}
                      key={header.id}
                      style={{
                        ...getColumnPinningStyle({ column: header.column }),
                      }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rowModel.rows.length > 0 ? (
                rowModel.rows.map((row) => (
                  <TableRow
                    className="cursor-pointer bg-transparent transition-colors hover:bg-primary/10"
                    data-state={row.getIsSelected() && 'selected'}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          ...getColumnPinningStyle({ column: cell.column }),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="h-24 text-center" colSpan={visibleColumns.length}>
                    <p className="text-muted-foreground text-sm">
                      {getEmptyMessage(table, emptyMessage, emptyMessageFiltered)}
                    </p>
                    {emptyAction && <div className="mt-3 flex justify-center">{emptyAction}</div>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <DataTableMobileView
        emptyAction={emptyAction}
        emptyMessage={emptyMessage}
        emptyMessageFiltered={emptyMessageFiltered}
        table={table}
      />

      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} totalCount={totalCount} />
        {actionBar && (table.getFilteredSelectedRowModel?.()?.rows?.length ?? 0) > 0 && actionBar}
      </div>
    </div>
  );
};
