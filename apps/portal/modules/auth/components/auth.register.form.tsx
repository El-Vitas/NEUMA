'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { FormField } from '@/shared/components/ui/form-field';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { INITIAL_FORM_STATE } from '../constants/auth.form.constants';
import { submitRegister } from '../lib/auth.form.lib';

export const RegisterForm = () => {
  const [state, formAction, isPending] = useActionState(submitRegister, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormField
        id="register-name"
        label="Nombre completo"
        maxLength={100}
        minLength={2}
        name="name"
        placeholder="Juan Pérez"
        required
        type="text"
      />

      <FormField
        id="register-email"
        label="Correo electrónico"
        name="email"
        placeholder="nombre@correo.com"
        required
        type="email"
      />

      <FormField
        id="register-password"
        label="Contraseña"
        minLength={8}
        name="password"
        placeholder="••••••••"
        required
        type="password"
      />

      {state.message !== '' && <p className="text-sm text-status-error">{state.message}</p>}

      <Button className="mt-2 h-12 w-full" disabled={isPending} size="lg" type="submit" variant="primary">
        {isPending ? 'Creando account...' : 'Crear account'}
      </Button>

      <p className="mt-6 text-base text-status-muted">
        ¿Ya tienes account?{' '}
        <Link className="text-highlight-soft hover:text-highlight-strong" href={ROUTES.LOGIN}>
          Inicia sesión
        </Link>
      </p>
    </form>
  );
};
