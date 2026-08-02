import type { Table as TanstackTable } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';

interface MobileHeaderProps<TData> {
  readonly table: TanstackTable<TData>;
}

export const MobileHeader = <TData,>({ table }: MobileHeaderProps<TData>) => {
  const t = useTranslations('common');
  return (
    <div className="flex items-center gap-3 border-border border-b bg-muted/30 px-4 py-3">
      <Checkbox
        aria-label={t('selectAllRows')}
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
      <span className="text-muted-foreground text-xs">
        {t('selectedRows', {
          selected: table.getFilteredSelectedRowModel().rows.length,
          total: table.getFilteredRowModel().rows.length,
        })}
      </span>
    </div>
  );
};
