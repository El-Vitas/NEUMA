import { canEditContent, USER_ROLE } from '@neuma/shared';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { PAGE_RECENT_LIMIT } from '@/modules/pages/tree/constants/pages.tree.constants';
import { getRecentPages, getTreeRoots } from '@/modules/pages/tree/server/queries/pages.tree.queries';
import type { PageRecentEntry, PageTreeEntry } from '@/modules/pages/tree/types/pages.tree.types';
import { SpacesEmptyState } from '@/modules/spaces/components/spaces.empty.state';
import { getSpaceMembers, getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import type { SpaceHomeActivity, SpaceHomePage } from '@/modules/spaces/types/spaces.home.types';
import { SpacesHomeView } from '@/modules/spaces/views/spaces.home.view';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';

interface IProps {
  readonly params: Promise<{ spaceId: string }>;
}

/** Narrows the page so the spaces module does not depend on the rest of the page shape. */
const toSpaceHomePage = (page: Pick<PageTreeEntry, 'icon' | 'id' | 'title'>): SpaceHomePage => ({
  icon: page.icon,
  id: page.id,
  title: page.title,
});

const toSpaceHomeActivity = (page: PageRecentEntry): SpaceHomeActivity => ({
  ...toSpaceHomePage(page),
  editedAt: page.updatedAt,
  editedBy: page.updatedByName,
});

export default async function Page({ params }: IProps) {
  const [{ spaceId }, spacesResult, user] = await Promise.all([params, getSpaces(), getCurrentUser()]);
  if (spacesResult.isFail()) throw spacesResult.getError();
  const space = spacesResult.getValue().find((candidate) => candidate.id === spaceId);
  if (space === undefined) notFound();
  const canEdit = canEditContent(user?.role ?? USER_ROLE.CLIENT);

  const [rootsResult, recentResult, membersResult, locale] = await Promise.all([
    getTreeRoots(spaceId),
    getRecentPages(spaceId, PAGE_RECENT_LIMIT),
    getSpaceMembers(spaceId),
    getLocale(),
  ]);
  if (rootsResult.isFail()) throw rootsResult.getError();
  const roots = rootsResult.getValue();
  if (roots.total === 0) return <SpacesEmptyState canCreatePage={canEdit} spaceId={spaceId} />;

  return (
    <SpacesHomeView
      activity={(recentResult.isOk() ? recentResult.getValue() : []).map(toSpaceHomeActivity)}
      canCreatePage={canEdit}
      canShare={space.visibility === 'PRIVATE' && space.ownerId === user?.id}
      locale={locale}
      mainPages={roots.entries.map(toSpaceHomePage)}
      members={membersResult.isOk() ? membersResult.getValue() : []}
      space={space}
    />
  );
}
