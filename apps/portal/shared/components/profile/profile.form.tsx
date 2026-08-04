'use client';

import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { updatePasswordAction, updateProfileNameAction } from '@/modules/account/server/actions/profile.actions';
import { DetailRow } from '@/shared/components/ui/detail-row';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { PASSWORD_MIN_LENGTH } from '@/shared/constants/password.constants';

interface IProps {
  readonly user: { id: string; name: string; email: string; role: string };
}

export const ProfileForm = ({ user }: IProps) => {
  const router = useRouter();
  const t = useTranslations('account');
  const roleTranslations = useTranslations('users.roles');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [syncedName, setSyncedName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (user.name !== syncedName) {
    setSyncedName(user.name);
    setName(user.name);
  }

  const handleUpdateName = async () => {
    const result = await updateProfileNameAction({ userId: user.id, name });
    if (result?.serverError) {
      toast.error(t('nameUpdateError'));
    } else {
      toast.success(t('nameUpdated'));
      router.refresh();
    }
  };

  const handleUpdatePassword = async () => {
    const result = await updatePasswordAction({ userId: user.id, currentPassword, newPassword });
    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('personalInformation')}</h3>
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <button
              className="inline-flex items-center gap-2 rounded-none border border-border bg-background px-3 py-1.5 text-foreground text-sm hover:bg-accent"
              type="button"
            >
              <Pencil className="size-3.5" />
              {t('editAccount')}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('editAccountTitle')}</DialogTitle>
              <DialogDescription>{t('editAccountDescription')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-sm" htmlFor="name">
                    {t('name')}
                  </label>
                  <input
                    className="h-9 w-full rounded-none border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    id="name"
                    onChange={(e) => setName(e.target.value)}
                    value={name}
                  />
                </div>
                <DialogFooter>
                  <button
                    className="inline-flex h-9 items-center rounded-none bg-primary px-4 font-semibold text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
                    disabled={!name.trim() || name === user.name}
                    onClick={handleUpdateName}
                    type="button"
                  >
                    {t('saveName')}
                  </button>
                </DialogFooter>
              </div>

              <div className="space-y-4 border-border border-t pt-4">
                <h4 className="font-medium text-foreground text-sm">{t('changePassword')}</h4>
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-sm" htmlFor="current-password">
                    {t('currentPassword')}
                  </label>
                  <input
                    autoComplete="current-password"
                    className="h-9 w-full rounded-none border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    id="current-password"
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    value={currentPassword}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-sm" htmlFor="new-password">
                    {t('newPassword')}
                  </label>
                  <input
                    autoComplete="new-password"
                    className="h-9 w-full rounded-none border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    id="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    value={newPassword}
                  />
                  <p className="text-muted-foreground text-xs">
                    {t('passwordMinimum', { count: PASSWORD_MIN_LENGTH })}
                  </p>
                </div>
                <DialogFooter>
                  <button
                    className="inline-flex h-9 items-center rounded-none bg-primary px-4 font-semibold text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
                    disabled={!currentPassword.trim() || newPassword.trim().length < PASSWORD_MIN_LENGTH}
                    onClick={handleUpdatePassword}
                    type="button"
                  >
                    {t('changePassword')}
                  </button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DetailRow label={t('name')} value={user.name} />
        <DetailRow label={t('email')} value={user.email} />
        <DetailRow label={t('role')} value={roleTranslations(user.role as 'ADMIN' | 'WORKER' | 'CLIENT')} />
      </div>
    </div>
  );
};
