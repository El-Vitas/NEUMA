'use client';

import type { Column } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MobileSelectFilterProps<TData> {
  readonly column: Column<TData>;
  readonly title: string;
}

export const MobileSelectFilter = <TData,>({ column, title }: MobileSelectFilterProps<TData>) => {
  const t = useTranslations('common');
  const singleValue = (() => {
    const val = column.getFilterValue();
    if (Array.isArray(val)) return val[0];
    return val;
  })();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-muted-foreground text-xs">{title}</span>
      <Select
        onValueChange={(value) => {
          column.setFilterValue(value || undefined);
        }}
        value={singleValue ? String(singleValue) : ''}
      >
        <SelectTrigger className="h-9 w-full rounded-none border text-foreground">
          <SelectValue placeholder={title} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('all')}</SelectItem>
          {(column.columnDef.meta?.options ?? []).map((option: { label: string; value: string }) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
