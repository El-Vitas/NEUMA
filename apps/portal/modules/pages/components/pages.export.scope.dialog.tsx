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
  readonly onClose: () => void;
  readonly onConfirm: (includeChildren: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}

/** Asked only of a page that has pages under it: for one that has none there is nothing to decide. */
export const PagesExportScopeDialog = ({ onClose, onConfirm, open, title }: IProps) => {
  const t = useTranslations('pages.export');

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('childrenQuestion', { name: title })}</DialogTitle>
          <DialogDescription>{t('childrenHelp')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" onClick={() => onConfirm(false)} type="button" variant="outline">
            {t('childrenNo')}
          </Button>
          <Button className="min-h-11" onClick={() => onConfirm(true)} type="button">
            {t('childrenYes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
