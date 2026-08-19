'use client';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormField } from '@/shared/components/ui/form-field';
import { INITIAL_FORM_STATE } from '../constants/auth.form.constants';
import { submitLogin } from '../lib/auth.form.lib';
import { AuthFormStatus } from './auth.form.status';
import { AuthPasswordField } from './auth.password.field';

export const LoginForm = () => {
  const t = useTranslations('auth.login');
  const [state, formAction, isPending] = useActionState(submitLogin, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormField
        autoComplete="email"
        id="login-email"
        label={t('email')}
        name="email"
        placeholder={t('emailPlaceholder')}
        required
        type="email"
      />

      <AuthPasswordField autoComplete="current-password" id="login-password" label={t('password')} />

      <AuthFormStatus
        errorMessage={state.messageKey ? t(state.messageKey) : state.message}
        isPending={isPending}
        state={state}
        submitLabel={t('submit')}
        submittingLabel={t('submitting')}
      />
    </form>
  );
};
