'use client';

import type { UserRole } from '@neuma/shared';
import { Plus } from 'lucide-react';
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
import { PASSWORD_MIN_LENGTH } from '@/shared/constants/password.constants';
import { hasActionError, readActionFailureReason } from '@/shared/lib/action-result';
import { USERS_DIALOG_INPUT_CLASS, USERS_NEW_ACCOUNT_ROLE } from '../constants/users.constants';
import { isCreateUserInputValid } from '../lib/users.lib';
import { createUserAction } from '../server/actions/users.actions';
import { UsersCreateDialogRole } from './users.create.dialog.role';

export const UsersCreateDialog = () => {
  const t = useTranslations('users');
  const tErrors = useTranslations('errors');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(USERS_NEW_ACCOUNT_ROLE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = isCreateUserInputValid({ name, email, password, role });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole(USERS_NEW_ACCOUNT_ROLE);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const result = await createUserAction({ name, email, password, role });

      if (hasActionError(result)) {
        toast.error(tErrors(`reasons.${readActionFailureReason(result)}`));
        return;
      }

      toast.success(t('createdSuccess'));
      resetForm();
      setOpen(false);
    } catch {
      toast.error(t('createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <PrimaryButton type="button">
          <Plus aria-hidden="true" className="size-4" />
          {t('newUser')}
        </PrimaryButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('newUserTitle')}</DialogTitle>
          <DialogDescription>{t('newUserDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            id="new-user-name"
            inputClassName={USERS_DIALOG_INPUT_CLASS}
            label={t('name')}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <FormField
            id="new-user-email"
            inputClassName={USERS_DIALOG_INPUT_CLASS}
            label={t('email')}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          <FormField
            autoComplete="new-password"
            id="new-user-password"
            inputClassName={USERS_DIALOG_INPUT_CLASS}
            label={t('password')}
            minLength={PASSWORD_MIN_LENGTH}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <p className="text-muted-foreground text-xs">{t('passwordRequirement', { count: PASSWORD_MIN_LENGTH })}</p>
          <UsersCreateDialogRole onChange={setRole} value={role} />
        </div>

        <DialogFooter>
          <PrimaryButton disabled={!isValid || isSubmitting} onClick={handleCreate} type="button">
            {isSubmitting ? t('creating') : t('create')}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
