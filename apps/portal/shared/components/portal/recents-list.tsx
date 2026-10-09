'use client';

import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { useRecentPages } from '@/shared/hooks/use.recents-storage.hook';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

export const RecentPagesList = () => {
  const t = useTranslations('portal.recents');
  const tCommon = useTranslations('common');
  const { hasLoaded, recentPages } = useRecentPages();

  if (!hasLoaded) return null;

  return (
    <section aria-label={t('title')} className="space-y-3">
      <h2 className="font-display font-semibold text-foreground text-lg">{t('title')}</h2>
      {recentPages.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {recentPages.map((entry) => (
            <li key={entry.pageId}>
              <Link
                className={`flex min-h-11 items-center gap-3 border border-border bg-card px-4 py-2 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 ${FOCUS_RING_CLASS}`}
                href={ROUTES.PORTAL_SPACE_PAGE(entry.spaceId, entry.pageId)}
              >
                <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="truncate font-medium text-foreground">{entry.title}</span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {tCommon('spaceLabel', { space: entry.spaceName })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
