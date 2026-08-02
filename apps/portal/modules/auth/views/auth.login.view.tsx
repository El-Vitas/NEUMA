import { getTranslations } from 'next-intl/server';
import { AuthViewLayout } from '@/shared/components/auth/auth.view.layout';
import { LoginForm } from '../components/auth.login.form';

const LoginView = async () => {
  const t = await getTranslations('auth.login');
  return (
    <AuthViewLayout description={t('description')} title={t('title')}>
      <LoginForm />
    </AuthViewLayout>
  );
};

export { LoginView };
