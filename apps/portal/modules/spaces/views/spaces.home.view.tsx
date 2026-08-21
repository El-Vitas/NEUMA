import { BookOpen, Settings } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { SidebarTreeIcon } from '@/shared/components/portal/sidebar/sidebar-tree-icon';
import { StartPageButton } from '@/shared/components/portal/start-page-button';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { SpaceMember } from '@/shared/types/space-members.types';
import { SpacesHomeActivity } from '../components/spaces.home.activity';
import { SpacesHomeMembers } from '../components/spaces.home.members';
import { SpacesHomePages } from '../components/spaces.home.pages';
import { SpacesShareForm } from '../components/spaces.share.form';
import { selectSpaceHomeActivity, selectSpaceHomeMainPages } from '../lib/spaces.home.lib';
import type { SpaceHomeActivity, SpaceHomePage } from '../types/spaces.home.types';
import type { SpaceSummary } from '../types/spaces.types';

interface IProps {
  readonly activity: readonly SpaceHomeActivity[];
  readonly canCreatePage: boolean;
  /** Only whoever owns a private space hands it to anybody else. */
  readonly canShare?: boolean;
  readonly locale: string;
  readonly mainPages: readonly SpaceHomePage[];
  readonly members: readonly SpaceMember[];
  readonly space: SpaceSummary;
}

/**
 * Where a space begins: what it is made of, what has moved in it lately, and who
 * is in it. A space that opened on «pick a page» asked the question it was
 * supposed to answer.
 */
export const SpacesHomeView = async ({
  activity,
  canCreatePage,
  canShare = false,
  locale,
  mainPages,
  members,
  space,
}: IProps) => {
  const t = await getTranslations('spaces.home');
  const tPrivacy = await getTranslations('spaces.privacy');

  return (
    <main className="min-h-full space-y-8 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex min-w-0 items-center gap-2 font-bold text-2xl">
          {/* Drawn here rather than handed over: a drawing cannot cross into a client component. */}
          {space.icon === null ? (
            <BookOpen aria-hidden="true" className="size-6 shrink-0" />
          ) : (
            <SidebarTreeIcon className="size-6" icon={space.icon} />
          )}
          <span className="min-w-0 truncate">{space.name}</span>
        </h1>
        <div className="flex items-center gap-2">
          {canCreatePage && (
            <Link
              className={`inline-flex min-h-11 items-center gap-2 px-3 text-muted-foreground text-sm hover:text-foreground ${FOCUS_RING_CLASS}`}
              href={ROUTES.PORTAL_SPACE_SETTINGS(space.id)}
            >
              <Settings aria-hidden="true" className="size-4" />
              {t('settings')}
            </Link>
          )}
          {canCreatePage && <StartPageButton label={t('startPage')} spaceId={space.id} />}
        </div>
      </header>

      {space.description !== null && <p className="max-w-prose text-muted-foreground">{space.description}</p>}

      <section className="space-y-3">
        <h2 className="font-medium text-foreground text-sm">{t('mainPages')}</h2>
        <SpacesHomePages pages={selectSpaceHomeMainPages(mainPages)} spaceId={space.id} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-foreground text-sm">{t('activity')}</h2>
        <SpacesHomeActivity activity={selectSpaceHomeActivity(activity)} locale={locale} spaceId={space.id} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-foreground text-sm">{t('members')}</h2>
        <SpacesHomeMembers members={members} />
      </section>

      {canShare && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground text-sm">{tPrivacy('shareLabel')}</h2>
          <SpacesShareForm assignableMembers={members} spaceId={space.id} />
        </section>
      )}
    </main>
  );
};
