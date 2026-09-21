'use client';

import type { Column, RowData } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DataTableDateFilter } from '@/shared/components/data-table/data-table-date-filter';
import { DataTableFacetedFilter } from '@/shared/components/data-table/data-table-faceted-filter';
import { DataTableSliderFilter } from '@/shared/components/data-table/data-table-slider-filter';
import { getStringFilterValue } from '@/shared/lib/data-table.lib';
import type { DataTableFeatures } from '@/shared/types/table.types';

interface DataTableToolbarFilterProps<TData extends RowData> {
  readonly column: Column<DataTableFeatures, TData, unknown>;
}

export const DataTableToolbarFilter = <TData extends RowData>({ column }: DataTableToolbarFilterProps<TData>) => {
  const columnMeta = column.columnDef.meta;
  const variant = columnMeta?.variant;

  if (!variant) return null;

  switch (variant) {
    case 'text':
      return (
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-muted-foreground text-xs" htmlFor={column.id}>
            {columnMeta.label}
          </label>
          <Input
            className="h-9 w-full rounded-none border"
            id={column.id}
            onChange={(event) => column.setFilterValue(event.target.value)}
            placeholder={columnMeta.placeholder ?? columnMeta.label}
            value={getStringFilterValue(column)}
          />
        </div>
      );

    case 'number':
      return (
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-muted-foreground text-xs" htmlFor={column.id}>
            {columnMeta.label}
          </label>
          <div className="relative">
            <Input
              className={cn('h-9 w-full pr-8', columnMeta.unit && 'pr-8')}
              id={column.id}
              inputMode="numeric"
              onChange={(event) => column.setFilterValue(event.target.value)}
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              type="number"
              value={getStringFilterValue(column)}
            />
            {columnMeta.unit && (
              <span className="absolute inset-y-0 right-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                {columnMeta.unit}
              </span>
            )}
          </div>
        </div>
      );

    case 'range':
      return <DataTableSliderFilter column={column} title={columnMeta.label ?? column.id} />;

    case 'date':
    case 'dateRange':
      return (
        <DataTableDateFilter column={column} multiple={variant === 'dateRange'} title={columnMeta.label ?? column.id} />
      );

    case 'select':
    case 'multiSelect':
      return (
        <DataTableFacetedFilter
          column={column}
          multiple={variant === 'multiSelect'}
          options={columnMeta.options ?? []}
          title={columnMeta.label ?? column.id}
        />
      );

    default:
      return null;
  }
};
