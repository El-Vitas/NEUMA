'use client';

import { ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandInput, CommandList } from '@/shared/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { hasActionError, isActionSuccess, isLockedActionFailure } from '@/shared/lib/action-result';
import { getSpaceMoveAccessLossAction } from '@/shared/server/actions/space-move-access.actions';
import type { SpaceMoveAccessLoss } from '@/shared/types/space-move-access.types';
import { movePageAction } from '../../server/actions/pages.actions';
import type { PageSummary } from '../../types/pages.types';
import { usePagesMoveDestinations } from '../hooks/use.pages.move.destinations';
import {
  buildPageMoveDestinations,
  describeCurrentPageMoveDestination,
  isSamePageMoveDestination,
} from '../lib/pages.move.lib';
import type { PageMoveDestination, PendingAccessLossPageMove } from '../types/pages.move.types';
import { PagesMoveAccessWarningDialog } from './pages.move.access-warning.dialog';
import { PagesMoveSpaceGroup } from './pages.move.space-group';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly page: PageSummary;
  readonly spaceId: string;
}

export const PagesMoveForm = ({ ariaLabelledBy, page, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingAccessLossMove, setPendingAccessLossMove] = useState<PendingAccessLossPageMove | null>(null);
  const [query, setQuery] = useState('');
  const destinations = usePagesMoveDestinations(true, page.id, spaceId, query.trim());
  const choices = buildPageMoveDestinations(destinations, query.trim(), t('spaceRoot'), t('untitled'));
  const current = describeCurrentPageMoveDestination(
    destinations,
    page.spaceId,
    page.parentId,
    t('spaceRoot'),
    t('untitled'),
  );
  const changeOpen = (nextOpen: boolean): void => {
    setIsOpen(nextOpen);
    if (!nextOpen) setQuery('');
  };

  const executeMove = (destination: PageMoveDestination): void => {
    startTransition(async () => {
      const result = await movePageAction({
        pageId: page.id,
        parentId: destination.pageId,
        spaceId,
        targetSpaceId: destination.spaceId === page.spaceId ? undefined : destination.spaceId,
      });
      if (hasActionError(result)) {
        toast.error(isLockedActionFailure(result) ? tErrors('reasons.locked') : t('moveError'));
        return;
      }
      toast.success(t('moved'));
    });
  };

  const selectDestination = (destination: PageMoveDestination): void => {
    changeOpen(false);
    if (isSamePageMoveDestination(destination, page.spaceId, page.parentId)) return;
    if (destination.spaceId === page.spaceId) {
      executeMove(destination);
      return;
    }
    startTransition(async () => {
      const result = await getSpaceMoveAccessLossAction({
        sourceSpaceId: page.spaceId,
        targetSpaceId: destination.spaceId,
      });
      if (!isActionSuccess<SpaceMoveAccessLoss>(result)) {
        toast.error(t('moveAccessWarning.checkError'));
        return;
      }
      if (result.data.count === 0) {
        executeMove(destination);
        return;
      }
      setPendingAccessLossMove({ count: result.data.count, destination });
    });
  };

  const confirmPendingMove = (): void => {
    if (pendingAccessLossMove === null) return;
    executeMove(pendingAccessLossMove.destination);
    setPendingAccessLossMove(null);
  };

  return (
    <>
      <Popover onOpenChange={changeOpen} open={isOpen}>
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
          <Command shouldFilter={false}>
            <CommandInput onValueChange={setQuery} placeholder={t('moveSearch')} value={query} />
            <CommandList>
              <CommandEmpty>{t('noMentionCandidates')}</CommandEmpty>
              {destinations.spaces.map((space) => (
                <PagesMoveSpaceGroup
                  choices={choices.filter((choice) => choice.spaceId === space.id)}
                  currentId={current?.id ?? null}
                  key={space.id}
                  onSelect={selectDestination}
                  space={space}
                />
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {pendingAccessLossMove !== null && (
        <PagesMoveAccessWarningDialog
          isPending={isPending}
          onCancel={() => setPendingAccessLossMove(null)}
          onConfirm={confirmPendingMove}
          pendingMove={pendingAccessLossMove}
        />
      )}
    </>
  );
};
