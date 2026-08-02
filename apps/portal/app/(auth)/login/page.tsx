import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthLoading } from '@/modules/auth/components/auth.loading';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { LoginView } from '@/modules/auth/views/auth.login.view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

const LoginPageContent = async () => {
  const user = await getCurrentUser();
  if (user !== null) {
    redirect(ROUTES.PORTAL);
  }
  return <LoginView />;
};

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
