'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { PageSummary } from '../types/pages.types';

interface IProps {
  readonly parentPages: readonly PageSummary[];
  readonly spaceId: string;
  readonly title: string;
}

export const PagesBreadcrumb = ({ parentPages, spaceId, title }: IProps) => {
  const t = useTranslations('pages');
  const currentTitle = title.length > 0 ? title : t('untitled');

  return (
    <nav aria-label={t('location')} className="min-w-0 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 text-muted-foreground text-xs">
        <li>
          <Link
            className="rounded-none p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={ROUTES.PORTAL_SPACE(spaceId)}
          >
            {t('spaceRoot')}
          </Link>
        </li>
        {parentPages.map((parentPage) => (
          <li className="flex min-w-0 items-center gap-1" key={parentPage.id}>
            <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
            <Link
              className="max-w-40 truncate rounded-none p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-56"
              href={ROUTES.PORTAL_SPACE_PAGE(spaceId, parentPage.id)}
              title={parentPage.title.length > 0 ? parentPage.title : t('untitled')}
            >
              {parentPage.title.length > 0 ? parentPage.title : t('untitled')}
            </Link>
          </li>
        ))}
        <li aria-current="page" className="flex min-w-0 items-center gap-1 text-foreground">
          <ChevronRight aria-hidden="true" className="size-3 shrink-0 text-primary" />
          <span className="max-w-44 truncate p-1 font-medium sm:max-w-64" title={currentTitle}>
            {currentTitle}
          </span>
        </li>
      </ol>
    </nav>
  );
};
