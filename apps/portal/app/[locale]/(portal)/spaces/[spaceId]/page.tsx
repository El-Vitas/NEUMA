import { canEditContent, PAGE_LIFECYCLE, USER_ROLE } from '@company-brain/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { PagesView } from '@/modules/pages/collections/views/pages.view';
import { getPages } from '@/modules/pages/server/queries/pages.queries';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { SpacesEmptyState } from '@/modules/spaces/components/spaces.empty.state';
import { getSpaceMembers, getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import type { SpaceHomeActivity, SpaceHomePage } from '@/modules/spaces/types/spaces.home.types';
import { SpacesHomeView } from '@/modules/spaces/views/spaces.home.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

interface IProps {
  readonly params: Promise<{ spaceId: string }>;
}

/**
 * The space's own pages, shaped the way its entrance reads them.
 *
 * Shaped here rather than handed over whole because the entrance belongs to the
 * spaces side of the application, which has no business knowing what else a page
 * carries around.
 */
const toSpaceHomePage = (page: PageSummary): SpaceHomePage => ({
  icon: page.icon ?? null,
  id: page.id,
  title: page.title,
});

const toSpaceHomeActivity = (page: PageSummary): SpaceHomeActivity => ({
  ...toSpaceHomePage(page),
  editedAt: page.updatedAt,
  editedBy: page.updatedBy?.name ?? null,
});

export default async function Page({ params }: IProps) {
  const { spaceId } = await params;
  const [spacesResult, user, t] = await Promise.all([getSpaces(), getCurrentUser(), getTranslations('pages')]);
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;
  const pagesResult = space === undefined ? null : await getPages(spaceId);
  const pages = pagesResult?.isOk() ? pagesResult.getValue() : null;
  const canEdit = canEditContent(user?.role ?? USER_ROLE.CLIENT);

  if (space === undefined || pages === null) {
    return (
      <PagesView
        canEditContent={canEdit}
        currentUserDisplayName={user?.name}
        pages={pages}
        spaceId={spaceId}
        spaceName={space?.name ?? t('spaceUnavailable')}
      />
    );
  }

  if (pages.length === 0) return <SpacesEmptyState canCreatePage={canEdit} spaceId={spaceId} />;

  const [membersResult, locale] = await Promise.all([getSpaceMembers(spaceId), getLocale()]);
  const livePages = pages.filter((page) => page.lifecycle === PAGE_LIFECYCLE.ACTIVE);

  return (
    <SpacesHomeView
      activity={livePages.map(toSpaceHomeActivity)}
      canCreatePage={canEdit}
      canShare={space.visibility === 'PRIVATE' && space.ownerId === user?.id}
      locale={locale}
      mainPages={livePages.filter((page) => page.parentId === null).map(toSpaceHomePage)}
      members={membersResult.isOk() ? membersResult.getValue() : []}
      space={space}
    />
  );
}
