'use client';

import type { Column } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableMobileFacetedFilter } from '@/shared/components/data-table/data-table-mobile-filters';
import { DataTableToolbarFilter } from '@/shared/components/data-table/data-table-toolbar-filters';
import { MobileSelectFilter } from '@/shared/components/data-table/mobile-select-filter';
import { getStringFilterValue } from '@/shared/lib/data-table.lib';

interface MobileFiltersProps<TData> {
  readonly columns: Column<TData>[];
  readonly isFiltered: boolean;
  readonly onReset: () => void;
}

export const MobileFilters = <TData,>({ columns, isFiltered, onReset }: MobileFiltersProps<TData>) => {
  const t = useTranslations('common');
  return (
    <div className="flex flex-col gap-3 border-border border-t p-3">
      {columns.map((column) => {
        const meta = column.columnDef.meta;
        if (meta?.variant === 'select') {
          return <MobileSelectFilter column={column} key={column.id} title={meta.label ?? column.id} />;
        }
        if (meta?.variant === 'multiSelect') {
          return (
            <DataTableMobileFacetedFilter
              column={column}
              key={column.id}
              options={meta.options ?? []}
              title={meta.label ?? column.id}
            />
          );
        }
        if (meta?.variant === 'dateRange' || meta?.variant === 'date') {
          return <DataTableToolbarFilter column={column} key={column.id} />;
        }
        if (meta?.variant === 'text') {
          return (
            <div className="flex flex-col gap-1.5" key={column.id}>
              <label className="font-medium text-muted-foreground text-xs" htmlFor={column.id}>
                {meta.label ?? column.id}
              </label>
              <Input
                className="h-9 w-full rounded-none border"
                id={column.id}
                onChange={(event) => column.setFilterValue(event.target.value)}
                placeholder={meta.placeholder ?? meta.label ?? column.id}
                value={getStringFilterValue(column)}
              />
            </div>
          );
        }
        return <DataTableToolbarFilter column={column} key={column.id} />;
      })}
      {isFiltered && (
        <Button
          aria-label={t('resetFilters')}
          className="h-9 self-start rounded-none border-dashed"
          onClick={onReset}
          size="sm"
          variant="outline"
        >
          <X />
          {t('resetFilters')}
        </Button>
      )}
    </div>
  );
};
