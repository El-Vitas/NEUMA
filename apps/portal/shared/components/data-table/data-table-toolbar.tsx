'use client';

import type { Table } from '@tanstack/react-table';
import { type ComponentProps, useCallback, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { DataTableExport } from '@/shared/components/data-table/data-table-export';
import { DataTableViewOptions } from '@/shared/components/data-table/data-table-view-options';

import { DesktopToolbar } from './data-table-toolbar.desktop-toolbar';
import { MobileToolbar } from './data-table-toolbar.mobile-toolbar';

interface DataTableToolbarProps<TData> extends ComponentProps<'div'> {
  readonly table: Table<TData>;
  readonly onExportCsv?: () => void;
  readonly onExportPdf?: () => void;
  readonly isExportingPdf?: boolean;
}

export const DataTableToolbar = <TData,>({
  table,
  children,
  className,
  onExportCsv,
  onExportPdf,
  isExportingPdf,
  ...props
}: Readonly<DataTableToolbarProps<TData>>) => {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const columns = useMemo(() => table.getAllColumns().filter((column) => column.getCanFilter()), [table]);

  const onReset = useCallback(() => {
    table.resetColumnFilters();
    setMobileFiltersOpen(false);
  }, [table]);

  return (
    <div
      aria-orientation="horizontal"
      className={cn('flex w-full items-center justify-between gap-3 pt-3', className)}
      role="toolbar"
      {...props}
    >
      <DesktopToolbar columns={columns} isFiltered={isFiltered} onReset={onReset} />

      <div className="hidden items-center gap-2 px-3 py-2 md:flex">
        <DataTableExport isExportingPdf={isExportingPdf} onExportCsv={onExportCsv} onExportPdf={onExportPdf} />
        {children}
        <DataTableViewOptions align="end" table={table} />
      </div>

      <MobileToolbar
        columns={columns}
        isExportingPdf={isExportingPdf}
        isFiltered={isFiltered}
        mobileFiltersOpen={mobileFiltersOpen}
        onExportCsv={onExportCsv}
        onExportPdf={onExportPdf}
        onReset={onReset}
        setMobileFiltersOpen={setMobileFiltersOpen}
      />
    </div>
  );
};
