'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { callAction, hasActionError, readActionFailureReason } from '@/shared/lib/action-result';
import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import { restorePageVersionAction } from '../server/actions/pages.history.actions';

interface IProps {
  readonly onClose: () => void;
  readonly onRestored: () => void;
  readonly pageId: string;
  readonly spaceId: string;
  readonly version: number;
}

export const PagesHistoryRestoreDialog = ({ onClose, onRestored, pageId, spaceId, version }: IProps) => {
  const t = useTranslations('pages.versionHistory');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors.reasons');
  const [isPending, startTransition] = useTransition();
  const [failure, setFailure] = useState<ActionFailureReason | null>(null);

  const confirmRestore = (): void => {
    setFailure(null);
    startTransition(async () => {
      const result = await callAction(() => restorePageVersionAction({ pageId, spaceId, version }));
      if (hasActionError(result)) {
        setFailure(readActionFailureReason(result));
        return;
      }
      onRestored();
    });
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
      open
    >
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>{t('confirmTitle')}</DialogTitle>
          <DialogDescription>{t('confirmBody')}</DialogDescription>
        </DialogHeader>
        {failure !== null && (
          <p className="text-destructive text-sm" role="alert">
            {tErrors(failure)}
          </p>
        )}
        <DialogFooter>
          <Button className="min-h-11" disabled={isPending} onClick={onClose} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button
            aria-busy={isPending}
            className="min-h-11"
            disabled={isPending}
            onClick={confirmRestore}
            type="button"
          >
            {isPending ? t('restoring') : t('confirmAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
