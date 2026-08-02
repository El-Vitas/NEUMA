import type { Table as TanstackTable } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';

interface MobileHeaderProps<TData> {
  readonly table: TanstackTable<TData>;
}

export const MobileHeader = <TData,>({ table }: MobileHeaderProps<TData>) => {
  return (
    <div className="flex items-center gap-3 border-border border-b bg-muted/30 px-4 py-3">
      <Checkbox
        aria-label="Seleccionar todas las filas"
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
      <span className="text-muted-foreground text-xs">
        {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} seleccionadas
      </span>
    </div>
  );
};
