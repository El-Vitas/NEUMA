'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { renamePageAction } from '@/modules/pages/server/actions/pages.actions';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { hasActionError } from '@/shared/lib/action-result';

interface IProps {
  readonly onClose: () => void;
  readonly onRenamed: () => void;
  readonly page: { readonly id: string; readonly title: string } | null;
  readonly spaceId: string;
}

export const SidebarPageRenameDialog = ({ onClose, onRenamed, page, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const [title, setTitle] = useState(page?.title ?? '');
  const [isPending, startTransition] = useTransition();

  if (page === null) return null;

  const rename = (): void => {
    startTransition(async () => {
      const result = await renamePageAction({ pageId: page.id, spaceId, title: title.trim() });
      /** Success returns nothing, so only a reported failure means the rename failed. */
      if (hasActionError(result)) {
        toast.error(t('permissionError'));
        return;
      }
      onRenamed();
      onClose();
    });
  };

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('renamePage')}</DialogTitle>
        </DialogHeader>
        <Input
          aria-label={t('titleField')}
          disabled={isPending}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && title.trim().length > 0) rename();
          }}
          value={title}
        />
        <DialogFooter>
          <Button disabled={isPending} onClick={onClose} type="button" variant="ghost">
            {t('cancelRename')}
          </Button>
          <Button disabled={isPending || title.trim().length === 0} onClick={rename} type="button">
            {t('confirmRename')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
