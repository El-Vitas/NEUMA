'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { FormField } from '@/shared/components/ui/form-field';
import { PASSWORD_MIN_LENGTH } from '@/shared/constants/password.constants';
import { hasActionError } from '@/shared/lib/action-result';
import { USERS_DIALOG_INPUT_CLASS } from '../constants/users.constants';
import { isCreateUserInputValid } from '../lib/users.lib';
import { createUserAction } from '../server/actions/users.actions';

export const UsersCreateDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = isCreateUserInputValid({ name, email, password });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    const result = await createUserAction({ name, email, password });
    setIsSubmitting(false);

    if (hasActionError(result)) {
      toast.error(result.serverError ?? 'No se pudo crear el usuario. Intenta de nuevo.');
      return;
    }

    toast.success('Usuario creado');
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <PrimaryButton type="button">
          <Plus aria-hidden="true" className="size-4" />
          Nuevo usuario
        </PrimaryButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            id="new-user-name"
            inputClassName={USERS_DIALOG_INPUT_CLASS}
            label="Nombre"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <FormField
            id="new-user-email"
            inputClassName={USERS_DIALOG_INPUT_CLASS}
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          <FormField
            autoComplete="new-password"
            id="new-user-password"
            inputClassName={USERS_DIALOG_INPUT_CLASS}
            label="Contraseña"
            minLength={PASSWORD_MIN_LENGTH}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <p className="text-muted-foreground text-xs">
            La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres.
          </p>
        </div>

        <DialogFooter>
          <PrimaryButton disabled={!isValid || isSubmitting} onClick={handleCreate} type="button">
            {isSubmitting ? 'Creando...' : 'Crear usuario'}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
