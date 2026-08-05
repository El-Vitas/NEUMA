'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { PageBacklinksResult } from '../types/pages.backlinks.types';

interface IProps {
  readonly backlinks: PageBacklinksResult;
}

export const PagesBacklinks = ({ backlinks }: IProps) => {
  const t = useTranslations('pages.backlinks');
  if (backlinks.items.length === 0) return null;

  const heading = t('title', { count: backlinks.count });

  return (
    <section aria-labelledby="page-backlinks-title" className="space-y-4 border-border border-t pt-6">
      <h2 className="font-display text-2xl text-foreground" id="page-backlinks-title">
        {heading}
      </h2>
      <ul aria-label={heading} className="space-y-2">
        {backlinks.items.map((backlink) => (
          <li key={backlink.id}>
            <Link
              className="flex min-h-11 items-center border border-border bg-surface px-3 text-foreground text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={ROUTES.PORTAL_SPACE_PAGE(backlink.spaceId, backlink.id)}
            >
              {backlink.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
