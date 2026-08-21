import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { getFavoritePages } from '@/modules/favorites/server/queries/favorites.queries';
import { getPages } from '@/modules/pages/server/queries/pages.queries';
import { PortalSkeleton } from '@/modules/portal/components/portal.skeleton';
import { PortalLayout } from '@/modules/portal/layout/portal.layout';
import { resolvePortalSpaceKind } from '@/modules/portal/lib/portal.sidebar.lib';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { readRequestTheme } from '@/shared/server/lib/theme.server';
import { redirect } from '../../../i18n/navigation';

const AuthGuard = async ({ children }: { readonly children: React.ReactNode }) => {
  const user = await getCurrentUser();
  if (user === null) {
    redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
    return null;
  }

  const [spacesResult, favoritesResult] = await Promise.all([getSpaces(), getFavoritePages()]);
  const spaceSummaries = spacesResult.isOk() ? spacesResult.getValue() : [];
  const favorites = favoritesResult.isOk() ? favoritesResult.getValue() : [];
  const spaces = await Promise.all(
    spaceSummaries.map(async (space) => {
      const pagesResult = await getPages(space.id);
      return {
        icon: space.icon,
        id: space.id,
        kind: resolvePortalSpaceKind(space.visibility, space.ownerId, user.id),
        name: space.name,
        pages: pagesResult.isOk()
          ? pagesResult.getValue().map((page) => ({
              icon: page.icon ?? null,
              id: page.id,
              lifecycle: page.lifecycle,
              order: page.order,
              parentId: page.parentId,
              title: page.title,
            }))
          : [],
      };
    }),
  );
  const portalUser = { email: user.email, name: user.name };
  const theme = await readRequestTheme();

  return (
    <PortalLayout favorites={favorites} role={user.role} spaces={spaces} themeChoice={theme.choice} user={portalUser}>
      {children}
    </PortalLayout>
  );
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
