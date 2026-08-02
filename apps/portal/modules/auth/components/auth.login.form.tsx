'use client';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { FormField } from '@/shared/components/ui/form-field';
import { INITIAL_FORM_STATE } from '../constants/auth.form.constants';
import { submitLogin } from '../lib/auth.form.lib';

export const LoginForm = () => {
  const t = useTranslations('auth.login');
  const [state, formAction, isPending] = useActionState(submitLogin, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormField
        id="login-email"
        label={t('email')}
        name="email"
        placeholder={t('emailPlaceholder')}
        required
        type="email"
      />

      <FormField
        id="login-password"
        label={t('password')}
        minLength={8}
        name="password"
        placeholder="********"
        required
        type="password"
      />

      {(state.message !== '' || state.messageKey !== undefined) && (
        <p className="text-sm text-status-error">{state.messageKey ? t(state.messageKey) : state.message}</p>
      )}

      <Button className="mt-2 h-12 w-full" disabled={isPending} size="lg" type="submit" variant="primary">
        {isPending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
};
