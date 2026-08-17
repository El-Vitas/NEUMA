'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
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
import { hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import { trashPageAction } from '../server/actions/pages.actions';
import { getPageTrashPreviewAction } from '../server/actions/pages.trash.actions';

interface IProps {
  readonly onClose: () => void;
  readonly onTrashed?: () => void;
  readonly page: { readonly id: string; readonly title: string } | null;
  readonly spaceId: string;
}

export const PagesTrashConfirmDialog = ({ onClose, onTrashed, page, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const tCommon = useTranslations('common');
  const [childPageCount, setChildPageCount] = useState<null | number>(null);
  const [resolvedPageId, setResolvedPageId] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const pageId = page?.id ?? null;
  const displayedChildPageCount = resolvedPageId === pageId ? childPageCount : null;

  useEffect(() => {
    if (pageId === null) return;
    let isCancelled = false;
    void getPageTrashPreviewAction({ pageId, spaceId }).then((result) => {
      if (isCancelled || !isActionSuccess<{ childPageCount: number }>(result)) return;
      setChildPageCount(result.data.childPageCount);
      setResolvedPageId(pageId);
    });
    return () => {
      isCancelled = true;
    };
  }, [pageId, spaceId]);

  if (page === null) return null;

  const confirmTrash = (): void => {
    startTransition(async () => {
      const result = await trashPageAction({ pageId: page.id, spaceId });
      if (hasActionError(result)) {
        toast.error(t('permissionError'));
        return;
      }
      toast.success(t('trashed'));
      onTrashed?.();
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
          <DialogTitle>{t('trashScreen.trashConfirmTitle')}</DialogTitle>
          <DialogDescription>
            {t('trashScreen.trashConfirmBody')}
            {displayedChildPageCount !== null && displayedChildPageCount > 0 && (
              <span className="mt-2 block font-medium text-foreground">
                {t('trashScreen.childPagesWillBeTrashedWarning', { count: displayedChildPageCount })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" disabled={isPending} onClick={onClose} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button className="min-h-11" disabled={isPending} onClick={confirmTrash} type="button">
            {t('trashPage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
