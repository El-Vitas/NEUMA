import { USER_ROLE } from '@company-brain/shared';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { PagesWorkspace } from '@/modules/pages/components/pages.workspace';
import { getPages } from '@/modules/pages/server/queries/pages.queries';
import { getPageSchema } from '@/modules/pages/server/queries/pages.schema.queries';
import type { PageSchema } from '@/modules/pages/types/pages.schema.types';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';

interface IProps {
  readonly params: Promise<{ spaceId: string }>;
  readonly searchParams?: Promise<{ parentId?: string }>;
}

export default async function Page({ params, searchParams }: IProps) {
  const { spaceId } = await params;
  const parentId = (await searchParams)?.parentId ?? null;
  const [spacesResult, user, pagesResult] = await Promise.all([getSpaces(), getCurrentUser(), getPages(spaceId)]);
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;
  const pages = pagesResult.isOk() ? pagesResult.getValue() : null;
  const hasContentEditAccess = canEditContent(user?.role ?? USER_ROLE.CLIENT);
  if (space === undefined || !hasContentEditAccess) notFound();
  const t = await getTranslations('pages');
  const resolvedParentId = pages?.some((page) => page.id === parentId) ? parentId : null;
  const parentSchemaResult = resolvedParentId === null ? null : await getPageSchema(spaceId, resolvedParentId);
  const parentSchema: PageSchema | null = parentSchemaResult?.isOk() ? parentSchemaResult.getValue() : null;

  return (
    <main className="min-h-full">
      {pages === null ? (
        <div className="p-4 sm:p-6">
          <FormErrorBanner message={t('loadError')} />
        </div>
      ) : (
        <PagesWorkspace
          canEditContent={hasContentEditAccess}
          currentUserDisplayName={user?.name}
          isNewPage
          pages={pages}
          parentId={resolvedParentId}
          parentSchema={parentSchema}
          selectedPageId={null}
          spaceId={spaceId}
        />
      )}
    </main>
  );
}
