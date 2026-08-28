'use client';

import type { Column, RowData } from '@tanstack/react-table';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useColumnFilterSelection } from '@/shared/hooks/use-column-filter-selection';
import { buildSelectionLabel } from '@/shared/lib/data-table.lib';
import type { DataTableFeatures } from '@/shared/types/table.types';

import type { Option } from '@/types/data-table';

interface DataTableMobileFacetedFilterProps<TData extends RowData, TValue> {
  readonly column?: Column<DataTableFeatures, TData, TValue>;
  readonly title?: string;
  readonly options: Option[];
}

export const DataTableMobileFacetedFilter = <TData extends RowData, TValue>({
  column,
  title,
  options,
}: DataTableMobileFacetedFilterProps<TData, TValue>) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations('common');

  const { onItemSelect, onReset, selectedValues } = useColumnFilterSelection(column);

  const selectedCount = selectedValues.size;
  const label = buildSelectionLabel(selectedCount, title ?? '');

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-muted-foreground text-xs">{title}</span>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className="h-9 w-full justify-start rounded-none border font-normal text-foreground"
            onClick={() => setOpen((o) => !o)}
            size="sm"
            variant="outline"
          >
            {label}
            <ChevronDown className="ml-auto size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-64 w-50 overflow-y-auto p-0">
          <div className="p-1">
            <button
              className={cn(
                'flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm transition-colors',
                selectedCount === 0 ? 'bg-primary/20 font-medium text-primary' : 'hover:bg-muted',
              )}
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              type="button"
            >
              <div className={cn('flex size-4 items-center justify-center border')}>
                {selectedCount === 0 && <Check className="size-3" />}
              </div>
              {t('all')}
            </button>
            {options.map((option) => {
              const isSelected = selectedValues.has(option.value);
              return (
                <button
                  className={cn(
                    'flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm transition-colors',
                    isSelected ? 'bg-primary/20 font-medium text-primary' : 'hover:bg-muted',
                  )}
                  key={option.value}
                  onClick={() => onItemSelect(option.value, isSelected)}
                  type="button"
                >
                  <div
                    className={cn(
                      'flex size-4 items-center justify-center border',
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground',
                    )}
                  >
                    {isSelected && <Check className="size-3 text-white" />}
                  </div>
                  {option.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
