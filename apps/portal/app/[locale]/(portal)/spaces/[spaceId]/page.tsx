import { USER_ROLE } from '@company-brain/shared';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { getPages } from '@/modules/pages/server/queries/pages.queries';
import { PagesView } from '@/modules/pages/views/pages.view';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';

interface IProps {
  readonly params: Promise<{ spaceId: string }>;
}

export default async function Page({ params }: IProps) {
  const { spaceId } = await params;
  const [spacesResult, user] = await Promise.all([getSpaces(), getCurrentUser()]);
  const t = await getTranslations('pages');
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;
  const pagesResult = space === undefined ? null : await getPages(spaceId);

  return (
    <PagesView
      canEditContent={canEditContent(user?.role ?? USER_ROLE.CLIENT)}
      currentUserDisplayName={user?.name}
      isNewPage={false}
      pages={pagesResult?.isOk() ? pagesResult.getValue() : null}
      spaceId={spaceId}
      spaceName={space?.name ?? t('spaceUnavailable')}
    />
  );
}
