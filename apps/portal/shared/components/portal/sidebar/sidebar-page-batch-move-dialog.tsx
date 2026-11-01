'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PagesMoveSpaceGroup } from '@/modules/pages/navigation/components/pages.move.space-group';
import { usePagesMoveDestinations } from '@/modules/pages/navigation/hooks/use.pages.move.destinations';
import { buildPageMoveDestinations } from '@/modules/pages/navigation/lib/pages.move.lib';
import type { PageMoveDestination } from '@/modules/pages/navigation/types/pages.move.types';
import { batchMovePagesAction } from '@/modules/portal/server/actions/portal.sidebar.selection.actions';
import type { PortalPageBatchOutcome } from '@/modules/portal/types/portal.sidebar.selection.types';
import { Button } from '@/shared/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandList } from '@/shared/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';

interface IProps {
  readonly anchorPageId: string;
  readonly onClose: () => void;
  readonly onMoved: (outcome: PortalPageBatchOutcome) => void;
  readonly open: boolean;
  readonly pageIds: readonly string[];
  readonly spaceId: string;
}

/** Destinations are fetched for the first selected page only; the set is the same for every page. */
export const SidebarPageBatchMoveDialog = ({ anchorPageId, onClose, onMoved, open, pageIds, spaceId }: IProps) => {
  const t = useTranslations('pages.selection');
  const tPages = useTranslations('pages');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const destinations = usePagesMoveDestinations(open, anchorPageId, spaceId, query.trim());
  const choices = buildPageMoveDestinations(destinations, query.trim(), tPages('spaceRoot'), tPages('untitled'));

  if (!open) return null;

  const close = (): void => {
    setQuery('');
    onClose();
  };

  const selectDestination = (destination: PageMoveDestination): void => {
    startTransition(async () => {
      const result = await callAction(() =>
        batchMovePagesAction({
          pageIds: [...pageIds],
          parentId: destination.pageId,
          spaceId,
          targetSpaceId: destination.spaceId === spaceId ? undefined : destination.spaceId,
        }),
      );
      if (!isActionSuccess<PortalPageBatchOutcome>(result)) {
        toast.error(t('moveError'));
        return;
      }
      setQuery('');
      onMoved(result.data);
    });
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
      open
    >
      <DialogContent className="p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{t('moveTitle', { count: pageIds.length })}</DialogTitle>
          <DialogDescription>{t('moveDescription')}</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput onValueChange={setQuery} placeholder={tPages('moveSearch')} value={query} />
          <CommandList>
            <CommandEmpty>{tPages('noMentionCandidates')}</CommandEmpty>
            {destinations.spaces.map((space) => (
              <PagesMoveSpaceGroup
                choices={choices.filter((choice) => choice.spaceId === space.id)}
                isDisabled={isPending}
                key={space.id}
                onSelect={selectDestination}
                space={space}
              />
            ))}
          </CommandList>
        </Command>
        <DialogFooter className="p-4 pt-0">
          <Button className="min-h-11" disabled={isPending} onClick={close} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
