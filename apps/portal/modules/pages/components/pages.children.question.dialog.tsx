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
  readonly namespace: 'pages.duplicate' | 'pages.export';
  readonly onClose: () => void;
  readonly onConfirm: (includeChildren: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}

/** Shared by duplicate and export; each brings its own wording through `namespace`. */
export const PagesChildrenQuestionDialog = ({ namespace, onClose, onConfirm, open, title }: IProps) => {
  const t = useTranslations(namespace);

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
