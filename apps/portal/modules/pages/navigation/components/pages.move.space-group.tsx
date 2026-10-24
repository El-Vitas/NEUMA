'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandGroup, CommandItem } from '@/shared/components/ui/command';
import type { PageMoveDestination, PageMoveSpace } from '../types/pages.move.types';

interface IProps {
  readonly choices: readonly PageMoveDestination[];
  /** The destination the page is in now, marked with a check; leave out to mark none. */
  readonly currentId?: string | null;
  readonly isDisabled?: boolean;
  readonly onSelect: (destination: PageMoveDestination) => void;
  readonly space: PageMoveSpace;
}

/** The destinations of one space under its name; a space with nothing to offer is not shown. */
export const PagesMoveSpaceGroup = ({ choices, currentId, isDisabled = false, onSelect, space }: IProps) => {
  if (choices.length === 0) return null;
  return (
    <CommandGroup heading={space.name}>
      {choices.map((choice) => (
        <CommandItem
          disabled={isDisabled}
          key={choice.id}
          onSelect={() => onSelect(choice)}
          value={`${space.id} ${choice.id}`}
        >
          {currentId !== undefined && (
            <Check aria-hidden="true" className={cn('size-4', choice.id !== currentId && 'opacity-0')} />
          )}
          {choice.title}
        </CommandItem>
      ))}
    </CommandGroup>
  );
};
