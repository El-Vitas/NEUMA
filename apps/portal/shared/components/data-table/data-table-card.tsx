'use client';

import type { RowData, Table as TanstackTable } from '@tanstack/react-table';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { DataTable, type DataTableProps } from '@/shared/components/data-table/data-table';
import { DataTableToolbar } from '@/shared/components/data-table/data-table-toolbar';
import type { DataTableFeatures } from '@/shared/types/table.types';

interface DataTableCardProps<TData extends RowData>
  extends Omit<DataTableProps<TData>, 'children'>,
    React.ComponentProps<'div'> {
  readonly table: TanstackTable<DataTableFeatures, TData>;
  readonly title?: string;
  readonly subTitle?: string;
  readonly onExportCsv?: () => void;
  readonly onExportPdf?: () => void;
  readonly isExportingPdf?: boolean;
  readonly isLoading?: boolean;
}

export const DataTableCard = <TData extends RowData>({
  table,
  title,
  subTitle,
  className,
  onExportCsv,
  onExportPdf,
  isExportingPdf,
  isLoading,
  emptyMessage,
  emptyMessageFiltered,
  emptyAction,
  totalCount,
}: Readonly<DataTableCardProps<TData>>) => {
  return (
    <div className={cn('overflow-hidden border border-border bg-card', className)}>
      {title && (
        <div className="flex items-center justify-between border-border border-b p-4 sm:px-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-foreground text-sm">{title}</h2>
            {subTitle && <p className="text-muted-foreground text-xs">{subTitle}</p>}
          </div>
        </div>
      )}
      <DataTable
        emptyAction={emptyAction}
        emptyMessage={emptyMessage}
        emptyMessageFiltered={emptyMessageFiltered}
        isLoading={isLoading}
        table={table}
        totalCount={totalCount}
      >
        <DataTableToolbar
          isExportingPdf={isExportingPdf}
          onExportCsv={onExportCsv}
          onExportPdf={onExportPdf}
          table={table}
        />
      </DataTable>
    </div>
  );
};
