import type { Table as TanstackTable } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { getEmptyMessage } from '@/shared/lib/data-table.lib';
import { MobileHeader } from './data-table-mobile-view.mobile-header';
import { MobileRowCard } from './data-table-mobile-view.mobile-row-card';

interface DataTableMobileViewProps<TData> {
  readonly table: TanstackTable<TData>;
  readonly emptyMessage?: string;
  readonly emptyMessageFiltered?: string;
  readonly emptyAction?: ReactNode;
}

export const DataTableMobileView = <TData,>({
  table,
  emptyMessage,
  emptyMessageFiltered,
  emptyAction,
}: DataTableMobileViewProps<TData>) => {
  const rows = table.getRowModel?.()?.rows ?? [];
  const hasRowSelection = Boolean(table.options?.enableRowSelection);
  const message = getEmptyMessage(table, emptyMessage, emptyMessageFiltered);

  if (!hasRowSelection && rows.length === 0) {
    return (
      <div className="border border-border bg-card md:hidden">
        <div className="flex flex-col items-center py-12 text-center text-muted-foreground text-sm">
          <p>{message}</p>
          {emptyAction && <div className="mt-3">{emptyAction}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border border border-border bg-card md:hidden">
      {hasRowSelection && <MobileHeader table={table} />}
      {rows.length > 0 ? (
        rows.map((row) => <MobileRowCard key={row.id} row={row} />)
      ) : (
        <div className="flex flex-col items-center py-12 text-center text-muted-foreground text-sm">
          <p>{message}</p>
          {emptyAction && <div className="mt-3">{emptyAction}</div>}
        </div>
      )}
    </div>
  );
};
