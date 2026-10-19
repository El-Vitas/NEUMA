'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { hasActionError } from '@/shared/lib/action-result';
import { emptyTrashAction } from '../server/actions/pages.trash.actions';

interface IProps {
  readonly disabled?: boolean;
}

export const PagesTrashEmptyTrashDialog = ({ disabled = false }: IProps) => {
  const t = useTranslations('pages');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirmEmptyTrash = (): void => {
    startTransition(async () => {
      const result = await emptyTrashAction({});
      if (hasActionError(result)) {
        toast.error(t('trashScreen.deleteForeverError'));
        return;
      }
      toast.success(t('trashScreen.emptyTrashScheduledToast'));
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="min-h-11" disabled={disabled} type="button" variant="destructive">
          {t('trashScreen.emptyTrash')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('trashScreen.emptyTrashTitle')}</DialogTitle>
          <DialogDescription>
            {t('trashScreen.emptyTrashBody')}
            <span className="mt-2 block font-medium text-destructive">{t('trashScreen.attachmentsWarning')}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            className="min-h-11"
            disabled={isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            className="min-h-11"
            disabled={isPending}
            onClick={confirmEmptyTrash}
            type="button"
            variant="destructive"
          >
            {t('trashScreen.emptyTrash')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
