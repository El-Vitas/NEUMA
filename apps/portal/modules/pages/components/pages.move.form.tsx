'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { hasActionError } from '@/shared/lib/action-result';
import { usePagesMoveDestinations } from '../hooks/use.pages.move.destinations';
import {
  buildPageMoveDestinations,
  findCurrentPageMoveDestination,
  isSamePageMoveDestination,
} from '../lib/pages.move.lib';
import { movePageAction } from '../server/actions/pages.actions';
import type { PageMoveDestination } from '../types/pages.move.types';
import type { PageSummary } from '../types/pages.types';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly page: PageSummary;
  readonly spaceId: string;
}

/**
 * Where the page lives, changed by naming the place rather than by hunting for
 * it in a list of everything: the destinations of every space one can reach are
 * narrowed as the name is typed. The page's own branch is not among them, since
 * a page cannot come to hang from something that hangs from it.
 */
export const PagesMoveForm = ({ ariaLabelledBy, page, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const destinations = usePagesMoveDestinations(isOpen, page.id, spaceId);
  const choices = buildPageMoveDestinations(destinations, t('spaceRoot'), t('untitled'));
  const current = findCurrentPageMoveDestination(choices, page.spaceId, page.parentId);

  const movePage = (destination: PageMoveDestination): void => {
    setIsOpen(false);
    if (isSamePageMoveDestination(destination, page.spaceId, page.parentId)) return;
    startTransition(async () => {
      const result = await movePageAction({
        pageId: page.id,
        parentId: destination.pageId,
        spaceId,
        targetSpaceId: destination.spaceId === page.spaceId ? undefined : destination.spaceId,
      });
      if (hasActionError(result)) {
        toast.error(t('moveError'));
        return;
      }
      toast.success(t('moved'));
    });
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger
        aria-labelledby={ariaLabelledBy}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 border border-border bg-background px-3 text-left text-sm',
          FOCUS_RING_CLASS,
        )}
        disabled={isPending}
      >
        <span className="min-w-0 truncate">
          {isPending ? t('moving') : (current?.title ?? t('spaceRoot'))}
          {current !== null && <span className="text-muted-foreground"> · {current.spaceName}</span>}
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder={t('moveSearch')} />
          <CommandList>
            <CommandEmpty>{t('noMentionCandidates')}</CommandEmpty>
            {destinations.spaces.map((space) => (
              <CommandGroup heading={space.name} key={space.id}>
                {choices
                  .filter((choice) => choice.spaceId === space.id)
                  .map((choice) => (
                    <CommandItem
                      key={choice.id}
                      onSelect={() => movePage(choice)}
                      value={`${space.name} ${choice.title}`}
                    >
                      <Check aria-hidden="true" className={cn('size-4', choice.id !== current?.id && 'opacity-0')} />
                      {choice.title}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
