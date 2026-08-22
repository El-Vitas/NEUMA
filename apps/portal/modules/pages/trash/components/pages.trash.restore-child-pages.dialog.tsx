'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

interface IProps {
  readonly onClose: () => void;
  readonly onConfirm: (includeChildren: boolean) => void;
  readonly open: boolean;
}

export const PagesTrashRestoreChildPagesDialog = ({ onClose, onConfirm, open }: IProps) => {
  const t = useTranslations('pages');

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('trashScreen.restoreChildPagesQuestion')}</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" onClick={() => onConfirm(false)} type="button" variant="outline">
            {t('trashScreen.restoreChildPagesNo')}
          </Button>
          <Button className="min-h-11" onClick={() => onConfirm(true)} type="button">
            {t('trashScreen.restoreChildPagesYes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
