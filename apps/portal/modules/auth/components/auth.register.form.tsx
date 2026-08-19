'use client';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormField } from '@/shared/components/ui/form-field';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { Link } from '../../../i18n/navigation';
import { INITIAL_FORM_STATE } from '../constants/auth.form.constants';
import { submitRegister } from '../lib/auth.form.lib';
import { AuthFormStatus } from './auth.form.status';
import { AuthPasswordField } from './auth.password.field';

export const RegisterForm = () => {
  const t = useTranslations('auth.register');
  const [state, formAction, isPending] = useActionState(submitRegister, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormField
        id="register-name"
        label={t('name')}
        maxLength={100}
        minLength={2}
        name="name"
        placeholder={t('namePlaceholder')}
        required
        type="text"
      />

      <FormField
        autoComplete="email"
        id="register-email"
        label={t('email')}
        name="email"
        placeholder={t('emailPlaceholder')}
        required
        type="email"
      />

      <AuthPasswordField autoComplete="new-password" id="register-password" label={t('password')} />

      <AuthFormStatus
        errorMessage={state.messageKey ? t(state.messageKey) : state.message}
        isPending={isPending}
        state={state}
        submitLabel={t('submit')}
        submittingLabel={t('submitting')}
      />

      <p className="mt-6 text-base text-status-muted">
        {t('existingAccount')}{' '}
        <Link className="text-highlight-soft hover:text-highlight-strong" href={ROUTES.LOGIN}>
          {t('signIn')}
        </Link>
      </p>
    </form>
  );
};
