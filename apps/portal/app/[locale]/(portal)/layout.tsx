import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import { getFavoritePages } from '@/modules/favorites/server/queries/favorites.queries';
import { PagesCollectionCacheProvider } from '@/modules/pages/collections/components/pages.collection.cache.provider';
import { PagesTreeLive } from '@/modules/pages/tree/components/pages.tree.live';
import { PagesTreeProvider } from '@/modules/pages/tree/components/pages.tree.provider';
import { EMPTY_TREE_ROOTS } from '@/modules/pages/tree/constants/pages.tree.constants';
import { listPageTreeWatermarks } from '@/modules/pages/tree/lib/pages.tree.lib';
import { getTreeRoots } from '@/modules/pages/tree/server/queries/pages.tree.queries';
import { PortalSkeleton } from '@/modules/portal/components/portal.skeleton';
import { PortalLayout } from '@/modules/portal/layout/portal.layout';
import { resolvePortalSpaceKind } from '@/modules/portal/lib/portal.sidebar.lib';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { RecentsOwnerProvider } from '@/shared/components/portal/recents-owner.provider';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';
import { readRequestTheme } from '@/shared/server/lib/theme.server';
import { redirect } from '../../../i18n/navigation';

const AuthGuard = async ({ children }: { readonly children: React.ReactNode }) => {
  const user = await getCurrentUser();
  if (user === null) {
    redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
    return null;
  }

  const [spacesResult, favoritesResult, theme] = await Promise.all([
    getSpaces(),
    getFavoritePages(),
    readRequestTheme(),
  ]);
  const spaceSummaries = spacesResult.isOk() ? spacesResult.getValue() : [];
  const favorites = favoritesResult.isOk() ? favoritesResult.getValue() : [];
  const spaceRoots = await Promise.all(
    spaceSummaries.map(async (space) => {
      const rootsResult = await getTreeRoots(space.id);
      return { id: space.id, roots: rootsResult.isOk() ? rootsResult.getValue() : EMPTY_TREE_ROOTS };
    }),
  );
  const spaces = spaceSummaries.map((space) => ({
    icon: space.icon,
    id: space.id,
    kind: resolvePortalSpaceKind(space.visibility, space.ownerId, user.id),
    name: space.name,
  }));
  const portalUser = { email: user.email, name: user.name };

  return (
    <RecentsOwnerProvider userId={user.id}>
      <PagesCollectionCacheProvider userId={user.id}>
        <PagesTreeProvider spaces={spaceRoots}>
          <PagesTreeLive spaceIds={spaces.map((space) => space.id)} watermarks={listPageTreeWatermarks(spaceRoots)} />
          <PortalLayout
            favorites={favorites}
            role={user.role}
            spaces={spaces}
            themeChoice={theme.choice}
            user={portalUser}
          >
            {children}
          </PortalLayout>
        </PagesTreeProvider>
      </PagesCollectionCacheProvider>
    </RecentsOwnerProvider>
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
