import type { Table as TanstackTable } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';
import { getHeaderLabel } from '@/shared/lib/data-table.lib';

interface MobileRowCardProps<TData> {
  readonly row: ReturnType<TanstackTable<TData>['getRowModel']>['rows'][number];
}

export const MobileRowCard = <TData,>({ row }: MobileRowCardProps<TData>) => {
  const visibleCells = row.getVisibleCells().filter((cell) => cell.column.id !== 'select');

  return (
    <div className="border-border border-b bg-card last:border-b-0">
      <div className="flex items-start gap-3 p-4">
        <div className="flex items-center pr-2">
          <Checkbox
            aria-label="Seleccionar fila"
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {visibleCells.map((cell) => {
            const label = getHeaderLabel(cell.column.columnDef, cell.column.id);

            return (
              <div className="flex flex-col gap-0.5" key={cell.id}>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
                <div className="text-foreground text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
