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
  readonly isBusy: boolean;
  readonly label: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly rowCount: number;
}

/** Removing a column clears that property value on its rows across the whole collection, not only this view. */
export const PagesCollectionBoardColumnRemoveDialog = ({ isBusy, label, onClose, onConfirm, rowCount }: IProps) => {
  const t = useTranslations('pages.collection');
  const tCommon = useTranslations('common');

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('removeColumnTitle', { column: label })}</DialogTitle>
          <DialogDescription>
            {t('removeColumnBody')}
            {rowCount > 0 && (
              <span className="mt-2 block font-medium text-foreground">
                {t('removeColumnRows', { count: rowCount })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" disabled={isBusy} onClick={onClose} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button className="min-h-11" disabled={isBusy} onClick={onConfirm} type="button" variant="destructive">
            {t('removeColumn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
