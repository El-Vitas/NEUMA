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
  /** Which of the two things is being asked about, since each says it in its own words. */
  readonly namespace: 'pages.duplicate' | 'pages.export';
  readonly onClose: () => void;
  readonly onConfirm: (includeChildren: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}

/**
 * Asked only of a page that has pages under it: for one that has none there is
 * nothing to decide.
 *
 * Duplicating and exporting ask the same question with different words, so the
 * question is written once and each of them brings its own wording.
 */
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
