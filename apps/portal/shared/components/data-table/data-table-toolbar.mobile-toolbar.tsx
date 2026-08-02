'use client';

import type { Column } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTableExport } from '@/shared/components/data-table/data-table-export';

import { MobileFilters } from './data-table-toolbar.mobile-filters';

interface MobileToolbarProps<TData> {
  readonly columns: Column<TData>[];
  readonly isFiltered: boolean;
  readonly mobileFiltersOpen: boolean;
  readonly setMobileFiltersOpen: (open: boolean) => void;
  readonly onReset: () => void;
  readonly onExportCsv?: () => void;
  readonly onExportPdf?: () => void;
  readonly isExportingPdf?: boolean;
}

export const MobileToolbar = <TData,>({
  columns,
  isFiltered,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  onReset,
  onExportCsv,
  onExportPdf,
  isExportingPdf,
}: MobileToolbarProps<TData>) => (
  <div className="flex w-full flex-col md:hidden">
    <div className="flex items-center justify-between px-3 py-2">
      <Button
        className="h-9 rounded-none text-foreground"
        onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
        size="sm"
        variant="outline"
      >
        <Filter className="size-4" />
        Filtros
        {isFiltered && (
          <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-primary font-medium text-[10px] text-primary-foreground">
            {columns.filter((col) => col.getFilterValue() !== undefined).length}
          </span>
        )}
        {mobileFiltersOpen ? <ChevronUp className="ml-1 size-4" /> : <ChevronDown className="ml-1 size-4" />}
      </Button>
      <DataTableExport
        isExportingPdf={isExportingPdf}
        onExportCsv={onExportCsv}
        onExportPdf={onExportPdf}
        variant="icon"
      />
    </div>

    {mobileFiltersOpen && <MobileFilters columns={columns} isFiltered={isFiltered} onReset={onReset} />}
  </div>
);
