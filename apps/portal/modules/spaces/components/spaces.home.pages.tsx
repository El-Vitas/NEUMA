import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SidebarTreeIcon } from '@/shared/components/portal/sidebar/sidebar-tree-icon';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { SpaceHomePage } from '../types/spaces.home.types';

interface IProps {
  readonly pages: readonly SpaceHomePage[];
  readonly spaceId: string;
}

/** The pages the space hangs directly from itself, which is what it is made of at first sight. */
export const SpacesHomePages = ({ pages, spaceId }: IProps) => {
  const t = useTranslations('spaces.home');

  if (pages.length === 0) return <p className="text-muted-foreground text-sm">{t('noPages')}</p>;

  return (
    <ul aria-label={t('mainPages')} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {pages.map((page) => (
        <li key={page.id}>
          <Link
            className={`flex min-h-11 items-center gap-2 border border-border bg-card px-3 py-2 text-sm hover:bg-muted ${FOCUS_RING_CLASS}`}
            href={ROUTES.PORTAL_SPACE_PAGE(spaceId, page.id)}
          >
            <SidebarTreeIcon icon={page.icon} />
            <span className="min-w-0 truncate">{page.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
