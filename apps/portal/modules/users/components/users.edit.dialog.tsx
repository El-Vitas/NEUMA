'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { FormField } from '@/shared/components/ui/form-field';
import { hasActionError } from '@/shared/lib/action-result';
import { USERS_DIALOG_INPUT_CLASS } from '../constants/users.constants';
import { updateUserNameAction } from '../server/actions/users.actions';
import type { UserListItem } from '../types/users.types';

interface IProps {
  readonly user: UserListItem;
}

export const UsersEditDialog = ({ user }: IProps) => {
  const t = useTranslations('users');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [syncedName, setSyncedName] = useState(user.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user.name !== syncedName) {
    setSyncedName(user.name);
    setName(user.name);
  }

  const isSaveDisabled = name.trim() === '' || name === user.name || isSubmitting;

  const handleRename = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateUserNameAction({ userId: user.id, name });

      if (hasActionError(result)) {
        toast.error(result.serverError ?? t('updateError'));
        return;
      }

      toast.success(t('updatedSuccess'));
      setOpen(false);
    } catch {
      toast.error(t('updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <button
          aria-label={t('editNamed', { name: user.name })}
          className="flex size-8 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('edit')}</DialogTitle>
          <DialogDescription>{t('editDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            id="edit-user-name"
            inputClassName={USERS_DIALOG_INPUT_CLASS}
            label={t('name')}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>

        <DialogFooter>
          <PrimaryButton disabled={isSaveDisabled} onClick={handleRename} type="button">
            {isSubmitting ? t('saving') : t('save')}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
