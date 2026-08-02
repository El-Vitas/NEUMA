import { getTranslations } from 'next-intl/server';
import { AuthViewLayout } from '@/shared/components/auth/auth.view.layout';
import { RegisterForm } from '../components/auth.register.form';

const RegisterView = async () => {
  const t = await getTranslations('auth.register');
  return (
    <AuthViewLayout description={t('description')} title={t('title')}>
      <RegisterForm />
    </AuthViewLayout>
  );
};

export { RegisterView };
