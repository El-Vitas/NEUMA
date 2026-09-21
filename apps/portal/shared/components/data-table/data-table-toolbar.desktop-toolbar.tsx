'use client';

import type { Column, RowData } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { DataTableToolbarFilter } from '@/shared/components/data-table/data-table-toolbar-filters';
import type { DataTableFeatures } from '@/shared/types/table.types';

interface DesktopToolbarProps<TData extends RowData> {
  readonly columns: Column<DataTableFeatures, TData, unknown>[];
  readonly isFiltered: boolean;
  readonly onReset: () => void;
}

export const DesktopToolbar = <TData extends RowData>({ columns, isFiltered, onReset }: DesktopToolbarProps<TData>) => {
  const t = useTranslations('common');
  return (
    <div className="hidden flex-1 items-end gap-2 px-3 py-2 md:flex">
      <div className="flex flex-wrap items-end gap-2">
        {columns.map((column) => (
          <DataTableToolbarFilter column={column} key={column.id} />
        ))}
        {isFiltered && (
          <Button
            aria-label={t('resetFilters')}
            className="h-9 rounded-none border-dashed"
            onClick={onReset}
            size="sm"
            variant="outline"
          >
            <X />
            {t('resetFilters')}
          </Button>
        )}
      </div>
    </div>
  );
};
