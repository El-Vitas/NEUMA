import { USER_ROLE } from '@company-brain/shared';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { PagesWorkspace } from '@/modules/pages/components/pages.workspace';
import { getPageAttachments } from '@/modules/pages/server/queries/pages.attachments.queries';
import { getPages } from '@/modules/pages/server/queries/pages.queries';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { PageHeader } from '@/shared/components/ui/page-header';

interface IProps {
  readonly params: Promise<{ pageId: string; spaceId: string }>;
}

export default async function Page({ params }: IProps) {
  const { pageId, spaceId } = await params;
  if (!z.uuid().safeParse(pageId).success) notFound();

  const [spacesResult, user, pagesResult, attachmentsResult] = await Promise.all([
    getSpaces(),
    getCurrentUser(),
    getPages(spaceId),
    getPageAttachments(pageId),
  ]);
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;
  const pages = pagesResult.isOk() ? pagesResult.getValue() : null;
  const selectedPage = pages?.find((page) => page.id === pageId);
  if (space === undefined || pages === null || selectedPage === undefined) notFound();

  const t = await getTranslations('pages');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader subtitle={t('subtitle')} title={space.name} />
      {attachmentsResult.isFail() ? (
        <FormErrorBanner message={t('loadError')} />
      ) : (
        <PagesWorkspace
          attachments={attachmentsResult.getValue()}
          canEditContent={canEditContent(user?.role ?? USER_ROLE.CLIENT)}
          currentUserDisplayName={user?.name}
          isNewPage={false}
          pages={pages}
          selectedPageId={selectedPage.id}
          spaceId={spaceId}
        />
      )}
    </main>
  );
}
