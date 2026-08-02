'use client';

import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { updatePasswordAction, updateProfileNameAction } from '@/modules/account/server/actions/profile.actions';
import { DetailRow } from '@/shared/components/ui/detail-row';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { PASSWORD_MIN_LENGTH } from '@/shared/constants/password.constants';
import { roleLabel } from '@/shared/lib/profile.lib';

interface IProps {
  readonly user: { id: string; name: string; email: string; role: string };
}

export const ProfileForm = ({ user }: IProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleUpdateName = async () => {
    const result = await updateProfileNameAction({ userId: user.id, name });
    if (result?.serverError) {
      toast.error('No se pudo actualizar el nombre. Intenta de nuevo.');
    } else {
      toast.success('Nombre actualizado');
      router.refresh();
    }
  };

  const handleUpdatePassword = async () => {
    const result = await updatePasswordAction({ userId: user.id, currentPassword, newPassword });
    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Información personal</h3>
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <button
              className="inline-flex items-center gap-2 rounded-none border border-border bg-background px-3 py-1.5 text-foreground text-sm hover:bg-accent"
              type="button"
            >
              <Pencil className="size-3.5" />
              Editar cuenta
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar cuenta</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-sm" htmlFor="name">
                    Nombre
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
                    Guardar nombre
                  </button>
                </DialogFooter>
              </div>

              <div className="space-y-4 border-border border-t pt-4">
                <h4 className="font-medium text-foreground text-sm">Cambiar contraseña</h4>
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-sm" htmlFor="current-password">
                    Contraseña actual
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
                    Nueva contraseña
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
                  <p className="text-muted-foreground text-xs">Mínimo {PASSWORD_MIN_LENGTH} caracteres.</p>
                </div>
                <DialogFooter>
                  <button
                    className="inline-flex h-9 items-center rounded-none bg-primary px-4 font-semibold text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
                    disabled={!currentPassword.trim() || newPassword.trim().length < PASSWORD_MIN_LENGTH}
                    onClick={handleUpdatePassword}
                    type="button"
                  >
                    Cambiar contraseña
                  </button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DetailRow label="Nombre" value={user.name} />
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Rol" value={roleLabel(user.role)} />
      </div>
    </div>
  );
};
