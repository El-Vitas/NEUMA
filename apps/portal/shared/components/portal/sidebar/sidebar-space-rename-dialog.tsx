'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { renameSpaceAction } from '@/modules/spaces/server/actions/spaces.actions';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';

interface IProps {
  readonly onClose: () => void;
  readonly onRenamed: () => void;
  readonly space: { readonly id: string; readonly name: string } | null;
}

export const SidebarSpaceRenameDialog = ({ onClose, onRenamed, space }: IProps) => {
  const t = useTranslations('navigation');
  const commonT = useTranslations('common');
  const pagesT = useTranslations('pages');
  const [name, setName] = useState(space?.name ?? '');
  const [isPending, startTransition] = useTransition();

  if (space === null) return null;

  const rename = (): void => {
    startTransition(async () => {
      const result = await callAction(() => renameSpaceAction({ name: name.trim(), spaceId: space.id }));
      if (!isActionSuccess(result)) {
        toast.error(pagesT('permissionError'));
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
          <DialogTitle>{t('renameSpace')}</DialogTitle>
        </DialogHeader>
        <Input
          aria-label={t('spaceNameField')}
          disabled={isPending}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && name.trim().length > 0) rename();
          }}
          value={name}
        />
        <DialogFooter>
          <Button disabled={isPending} onClick={onClose} type="button" variant="ghost">
            {commonT('cancel')}
          </Button>
          <Button disabled={isPending || name.trim().length === 0} onClick={rename} type="button">
            {commonT('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
