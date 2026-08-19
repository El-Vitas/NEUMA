import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SidebarTreeIcon } from '@/shared/components/portal/sidebar/sidebar-tree-icon';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { formatSearchResultDate } from '@/shared/lib/search.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { SpaceHomeActivity } from '../types/spaces.home.types';

interface IProps {
  readonly activity: readonly SpaceHomeActivity[];
  readonly locale: string;
  readonly spaceId: string;
}

/** What has been written in lately, so the space says what is alive in it and not only what exists. */
export const SpacesHomeActivity = ({ activity, locale, spaceId }: IProps) => {
  const t = useTranslations('spaces.home');

  if (activity.length === 0) return <p className="text-muted-foreground text-sm">{t('noActivity')}</p>;

  return (
    <ul aria-label={t('activity')} className="divide-y divide-border border border-border bg-card">
      {activity.map((entry) => (
        <li key={entry.id}>
          <Link
            className={`flex min-h-11 flex-col gap-0.5 px-3 py-2 text-sm hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${FOCUS_RING_CLASS}`}
            href={ROUTES.PORTAL_SPACE_PAGE(spaceId, entry.id)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <SidebarTreeIcon icon={entry.icon} />
              <span className="min-w-0 truncate">{entry.title}</span>
            </span>
            <span className="shrink-0 text-muted-foreground text-xs">
              {entry.editedBy === null
                ? formatSearchResultDate(locale, entry.editedAt.toISOString())
                : t('editedBy', {
                    name: entry.editedBy,
                    when: formatSearchResultDate(locale, entry.editedAt.toISOString()),
                  })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
