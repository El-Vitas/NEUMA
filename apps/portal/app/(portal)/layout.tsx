import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { PortalSkeleton } from '@/modules/portal/components/portal.skeleton';
import { PortalLayout } from '@/modules/portal/layout/portal.layout';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

const AuthGuard = async ({ children }: { readonly children: React.ReactNode }) => {
  const user = await getCurrentUser();
  if (user === null) {
    redirect(ROUTES.LOGIN);
  }

  return <PortalLayout role={user.role}>{children}</PortalLayout>;
};

const Layout = async ({ children }: { readonly children: React.ReactNode }) => {
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <AuthGuard>
        <Toaster
          closeButton
          duration={5000}
          icons={{
            error: <X className="text-danger" />,
            info: <Info className="text-info" />,
            success: <Check className="text-success" />,
            warning: <AlertTriangle className="text-warning" />,
          }}
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: '!bg-card !text-foreground text-sm !shadow-md !border-2 !border-border',
              content: '!text-foreground',
              title: '!text-foreground',
              description: '!text-muted-foreground !text-xs',
              error: '!border-danger',
              success: '!border-success',
              warning: '!border-warning',
              info: '!border-info',
            },
          }}
        />
        {children}
      </AuthGuard>
    </Suspense>
  );
};

export default Layout;
