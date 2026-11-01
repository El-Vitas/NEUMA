'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { callAction, hasActionError } from '@/shared/lib/action-result';
import { deletePageForeverAction } from '../server/actions/pages.trash.actions';

interface IProps {
  readonly onClose: () => void;
  readonly onDeleted?: () => void;
  readonly page: { readonly id: string; readonly spaceId: string; readonly title: string } | null;
}

export const PagesTrashDeleteForeverDialog = ({ onClose, onDeleted, page }: IProps) => {
  const t = useTranslations('pages');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  if (page === null) return null;

  const confirmDelete = (): void => {
    startTransition(async () => {
      const result = await callAction(() => deletePageForeverAction({ pageId: page.id, spaceId: page.spaceId }));
      if (hasActionError(result)) {
        toast.error(t('trashScreen.deleteForeverError'));
        return;
      }
      toast.success(t('trashScreen.purgeScheduledToast'));
      onDeleted?.();
      onClose();
    });
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('trashScreen.deleteForeverTitle')}</DialogTitle>
          <DialogDescription>
            {t('trashScreen.deleteForeverBody')}
            <span className="mt-2 block font-medium text-destructive">{t('trashScreen.attachmentsWarning')}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" disabled={isPending} onClick={onClose} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button className="min-h-11" disabled={isPending} onClick={confirmDelete} type="button" variant="destructive">
            {t('trashScreen.deleteForever')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
