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
import type { PendingAccessLossPageMove } from '../types/pages.move.types';

interface IProps {
  readonly isPending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly pendingMove: PendingAccessLossPageMove;
}

export const PagesMoveAccessWarningDialog = ({ isPending, onCancel, onConfirm, pendingMove }: IProps) => {
  const t = useTranslations('pages');
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
          <DialogTitle>{t('moveAccessWarning.title')}</DialogTitle>
          <DialogDescription>
            {t('moveAccessWarning.body', { count: pendingMove.count, space: pendingMove.destination.spaceName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" disabled={isPending} onClick={onCancel} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button className="min-h-11" disabled={isPending} onClick={onConfirm} type="button" variant="destructive">
            {t('moveAccessWarning.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
