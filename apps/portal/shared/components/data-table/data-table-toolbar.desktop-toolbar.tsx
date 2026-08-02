'use client';

import type { Column } from '@tanstack/react-table';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTableToolbarFilter } from '@/shared/components/data-table/data-table-toolbar-filters';

interface DesktopToolbarProps<TData> {
  readonly columns: Column<TData>[];
  readonly isFiltered: boolean;
  readonly onReset: () => void;
}

export const DesktopToolbar = <TData,>({ columns, isFiltered, onReset }: DesktopToolbarProps<TData>) => (
  <div className="hidden flex-1 items-end gap-2 px-3 py-2 md:flex">
    <div className="flex flex-wrap items-end gap-2">
      {columns.map((column) => (
        <DataTableToolbarFilter column={column} key={column.id} />
      ))}
      {isFiltered && (
        <Button
          aria-label="Reset filters"
          className="h-9 rounded-none border-dashed"
          onClick={onReset}
          size="sm"
          variant="outline"
        >
          <X />
          Reiniciar
        </Button>
      )}
    </div>
  </div>
);
