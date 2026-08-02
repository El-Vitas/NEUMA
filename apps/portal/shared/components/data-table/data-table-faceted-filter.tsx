'use client';

import type { Column } from '@tanstack/react-table';
import { Check, PlusCircle, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useFilterSelection } from '@/shared/hooks/use-filter-selection';
import type { Option } from '@/types/data-table';

interface DataTableFacetedFilterProps<TData, TValue> {
  readonly column?: Column<TData, TValue>;
  readonly title?: string;
  readonly options: Option[];
  readonly multiple?: boolean;
}

export const DataTableFacetedFilter = <TData, TValue>({
  column,
  title,
  options,
  multiple,
}: DataTableFacetedFilterProps<TData, TValue>) => {
  const [open, setOpen] = useState(false);

  const columnFilterValue = column?.getFilterValue();

  const { onItemSelect, onReset, selectedValues } = useFilterSelection<string>(columnFilterValue, (values) =>
    column?.setFilterValue(values),
  );

  const handleItemSelect = useCallback(
    (option: Option, isSelected: boolean) => {
      if (!column) return;

      if (multiple) {
        onItemSelect(option.value, isSelected);
      } else {
        column.setFilterValue(isSelected ? undefined : [option.value]);
        setOpen(false);
      }
    },
    [column, multiple, onItemSelect],
  );

  const handleReset = useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      onReset();
    },
    [onReset],
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className="rounded-none border-dashed font-normal text-foreground" size="sm" variant="outline">
          {selectedValues?.size > 0 ? (
            <span
              className="cursor-pointer rounded-none opacity-70 transition-opacity hover:opacity-100"
              onClick={handleReset}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleReset();
              }}
              role="none"
              tabIndex={-1}
            >
              <XCircle />
            </span>
          ) : (
            <PlusCircle />
          )}
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator className="mx-0.5 data-[orientation=vertical]:h-4" orientation="vertical" />
              <Badge className="rounded-full px-1 font-normal lg:hidden" variant="secondary">
                {selectedValues.size}
              </Badge>
              <div className="hidden items-center gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge className="rounded-full px-1 font-normal" variant="secondary">
                    {selectedValues.size} seleccionad
                    {selectedValues.size === 1 ? 'o' : 'os'}
                  </Badge>
                ) : (
                  options.reduce<React.ReactNode[]>((acc, option) => {
                    if (!selectedValues.has(option.value)) return acc;
                    acc.push(
                      <Badge className="rounded-full px-1 font-normal" key={option.value} variant="secondary">
                        {option.label}
                      </Badge>,
                    );
                    return acc;
                  }, [])
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-50 p-0">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="max-h-full">
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup className="max-h-75 scroll-py-1 overflow-y-auto overflow-x-hidden">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);

                return (
                  <CommandItem
                    className="cursor-pointer hover:bg-muted"
                    key={option.value}
                    onSelect={() => handleItemSelect(option, isSelected)}
                  >
                    <div
                      className={cn(
                        'mr-2 flex size-4 items-center justify-center border border-input',
                        isSelected ? 'border-primary bg-primary' : 'bg-transparent',
                      )}
                    >
                      <Check className={cn('size-3', isSelected ? 'text-white' : 'text-transparent')} />
                    </div>
                    {option.icon && <option.icon />}
                    <span className="truncate">{option.label}</span>
                    {option.count && <span className="ml-auto font-mono text-xs">{option.count}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem className="justify-center text-center" onSelect={() => handleReset()}>
                    Limpiar filtros
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
