'use client';

import type { Table } from '@tanstack/react-table';
import { Check, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ComponentProps, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DataTableViewOptionsProps<TData> extends ComponentProps<typeof PopoverContent> {
  readonly table: Table<TData>;
  readonly disabled?: boolean;
}

export const DataTableViewOptions = <TData,>({ table, disabled, ...props }: DataTableViewOptionsProps<TData>) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations('common');
  const listboxId = useId();
  const columns = useMemo(
    () => table.getAllColumns().filter((column) => column.accessorFn !== undefined && column.getCanHide()),
    [table],
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={t('toggleColumns')}
          className="ml-auto h-8 rounded-none border font-normal text-foreground"
          disabled={disabled}
          role="combobox"
          size="sm"
          variant="outline"
        >
          <Settings2 className="text-muted-foreground" />
          {t('view')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" {...props}>
        <Command>
          <CommandInput placeholder={t('searchColumns')} />
          <CommandList id={listboxId}>
            <CommandEmpty>{t('noColumns')}</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem key={column.id} onSelect={() => column.toggleVisibility(!column.getIsVisible())}>
                  <span className="truncate">{column.columnDef.meta?.label ?? column.id}</span>
                  <Check
                    className={cn('ml-auto size-4 shrink-0', column.getIsVisible() ? 'opacity-100' : 'opacity-0')}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
