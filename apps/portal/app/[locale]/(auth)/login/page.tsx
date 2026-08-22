import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthLoading } from '@/modules/auth/components/auth.loading';
import { LoginView } from '@/modules/auth/views/auth.login.view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';
import { redirect } from '../../../../i18n/navigation';

const LoginPageContent = async () => {
  const user = await getCurrentUser();
  if (user !== null) {
    redirect({ href: ROUTES.PORTAL, locale: await getLocale() });
  }
  return <LoginView />;
};

export default function Page() {
  return (
    <main className="min-h-screen bg-surface">
      <Suspense fallback={<AuthLoading />}>
        <LoginPageContent />
      </Suspense>
    </main>
  );
}
