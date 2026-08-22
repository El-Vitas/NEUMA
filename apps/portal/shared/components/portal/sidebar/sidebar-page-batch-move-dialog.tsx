'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { usePagesMoveDestinations } from '@/modules/pages/navigation/hooks/use.pages.move.destinations';
import { buildPageMoveDestinations } from '@/modules/pages/navigation/lib/pages.move.lib';
import type { PageMoveDestination } from '@/modules/pages/navigation/types/pages.move.types';
import { batchMovePagesAction } from '@/modules/portal/server/actions/portal.sidebar.selection.actions';
import type { PortalPageBatchOutcome } from '@/modules/portal/types/portal.sidebar.selection.types';
import { Button } from '@/shared/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { isActionSuccess } from '@/shared/lib/action-result';

interface IProps {
  readonly anchorPageId: string;
  readonly onClose: () => void;
  readonly onMoved: (outcome: PortalPageBatchOutcome) => void;
  readonly open: boolean;
  readonly pageIds: readonly string[];
  readonly spaceId: string;
}

/**
 * Where every selected page goes, picked once for the whole batch. The
 * destination list is asked for the first selected page rather than for each
 * one, since it is the same set of spaces and pages either way.
 */
export const SidebarPageBatchMoveDialog = ({ anchorPageId, onClose, onMoved, open, pageIds, spaceId }: IProps) => {
  const t = useTranslations('pages.selection');
  const tPages = useTranslations('pages');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const destinations = usePagesMoveDestinations(open, anchorPageId, spaceId);
  const choices = buildPageMoveDestinations(destinations, tPages('spaceRoot'), tPages('untitled'));

  if (!open) return null;

  const selectDestination = (destination: PageMoveDestination): void => {
    startTransition(async () => {
      const result = await batchMovePagesAction({
        pageIds: [...pageIds],
        parentId: destination.pageId,
        spaceId,
        targetSpaceId: destination.spaceId === spaceId ? undefined : destination.spaceId,
      });
      if (!isActionSuccess<PortalPageBatchOutcome>(result)) {
        toast.error(t('moveError'));
        return;
      }
      onMoved(result.data);
    });
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open
    >
      <DialogContent className="p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{t('moveTitle', { count: pageIds.length })}</DialogTitle>
          <DialogDescription>{t('moveDescription')}</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder={tPages('moveSearch')} />
          <CommandList>
            <CommandEmpty>{tPages('noMentionCandidates')}</CommandEmpty>
            {destinations.spaces.map((space) => (
              <CommandGroup heading={space.name} key={space.id}>
                {choices
                  .filter((choice) => choice.spaceId === space.id)
                  .map((choice) => (
                    <CommandItem
                      disabled={isPending}
                      key={choice.id}
                      onSelect={() => selectDestination(choice)}
                      value={`${space.name} ${choice.title}`}
                    >
                      {choice.title}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <DialogFooter className="p-4 pt-0">
          <Button className="min-h-11" disabled={isPending} onClick={onClose} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
