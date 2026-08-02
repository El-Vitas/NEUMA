'use client';

import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { EntitySelectProps } from './types/entity-select.types';

export const EntitySelect = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  addNewHref,
  addNewLabel,
}: EntitySelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const triggerText = selectedOption ? (selectedOption.triggerLabel ?? selectedOption.label) : placeholder;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="h-9 w-full justify-between bg-background font-normal text-foreground text-sm hover:bg-background"
          variant="outline"
        >
          {triggerText}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                  value={option.searchValue ?? [option.label, option.sublabel].filter(Boolean).join(' ')}
                >
                  <Check className={cn('mr-2 size-4 shrink-0', value === option.value ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.sublabel && (
                      <span className={cn('text-muted-foreground text-xs', option.sublabelMono && 'font-mono')}>
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
              {addNewHref && (
                <CommandItem onSelect={() => setOpen(false)} value="__add_new__">
                  <Link className="flex w-full items-center gap-2" href={addNewHref}>
                    <Plus className="size-4" />
                    <span>{addNewLabel}</span>
                  </Link>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
