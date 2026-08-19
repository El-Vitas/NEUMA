'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface IProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export const PagesAttachmentsDeleteConfirmDialog = ({ onCancel, onConfirm }: IProps) => {
  const t = useTranslations('pages.attachmentsPanel');
  const tCommon = useTranslations('common');

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
          <DialogDescription>{t('deleteConfirmBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" onClick={onCancel} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button className="min-h-11" onClick={onConfirm} type="button" variant="destructive">
            {tCommon('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
