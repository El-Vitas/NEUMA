import { USER_ROLE } from '@company-brain/shared';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { PagesWorkspace } from '@/modules/pages/components/pages.workspace';
import { getPages } from '@/modules/pages/server/queries/pages.queries';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';

interface IProps {
  readonly params: Promise<{ spaceId: string }>;
}

export default async function Page({ params }: IProps) {
  const { spaceId } = await params;
  const [spacesResult, user, pagesResult] = await Promise.all([getSpaces(), getCurrentUser(), getPages(spaceId)]);
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;
  const pages = pagesResult.isOk() ? pagesResult.getValue() : null;
  const hasContentEditAccess = canEditContent(user?.role ?? USER_ROLE.CLIENT);
  if (space === undefined || !hasContentEditAccess) notFound();
  const t = await getTranslations('pages');

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader subtitle={t('subtitle')} title={space?.name ?? t('spaceUnavailable')} />
      {pages === null ? (
        <FormErrorBanner message={t('loadError')} />
      ) : (
        <PagesWorkspace
          canEditContent={hasContentEditAccess}
          currentUserDisplayName={user?.name}
          isNewPage
          pages={pages}
          selectedPageId={null}
          spaceId={spaceId}
        />
      )}
    </main>
  );
}
