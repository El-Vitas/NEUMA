import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAssignedPages } from '@/modules/pages/server/queries/pages.queries';
import { SidebarTreeIcon } from '@/shared/components/portal/sidebar/sidebar-tree-icon';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

/** A page is assigned when a person property of its collection names the user, across all reachable spaces. */
export const AssignedPagesList = async () => {
  const t = await getTranslations('portal.assigned');
  const result = await getAssignedPages();
  const pages = result.isOk() ? result.getValue() : [];

  if (pages.length === 0) return null;

  return (
    <section aria-label={t('title')} className="space-y-3">
      <h2 className="font-medium text-foreground text-sm">{t('title')}</h2>
      <ul className="divide-y divide-border border border-border bg-card">
        {pages.map((page) => (
          <li key={page.id}>
            <Link
              className={`flex min-h-11 items-center gap-2 px-3 py-2 text-sm hover:bg-muted ${FOCUS_RING_CLASS}`}
              href={ROUTES.PORTAL_SPACE_PAGE(page.spaceId, page.id)}
            >
              <SidebarTreeIcon icon={page.icon ?? null} />
              <span className="min-w-0 truncate">{page.title.length > 0 ? page.title : t('untitled')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
