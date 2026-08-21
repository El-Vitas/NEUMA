'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { batchTrashPagesAction } from '@/modules/portal/server/actions/portal.sidebar.selection.actions';
import type { PortalPageBatchOutcome } from '@/modules/portal/types/portal.sidebar.selection.types';
import { Button } from '@/shared/components/ui/button';
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
  readonly onClose: () => void;
  readonly onTrashed: (outcome: PortalPageBatchOutcome) => void;
  readonly open: boolean;
  readonly pageIds: readonly string[];
  readonly spaceId: string;
}

export const SidebarPageBatchTrashDialog = ({ onClose, onTrashed, open, pageIds, spaceId }: IProps) => {
  const t = useTranslations('pages.selection');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const confirmTrash = (): void => {
    startTransition(async () => {
      const result = await batchTrashPagesAction({ pageIds: [...pageIds], spaceId });
      if (!isActionSuccess<PortalPageBatchOutcome>(result)) {
        toast.error(t('trashError'));
        return;
      }
      onTrashed(result.data);
    });
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('trashConfirmTitle', { count: pageIds.length })}</DialogTitle>
          <DialogDescription>{t('trashConfirmBody', { count: pageIds.length })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" disabled={isPending} onClick={onClose} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button className="min-h-11" disabled={isPending} onClick={confirmTrash} type="button">
            {t('trash')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
