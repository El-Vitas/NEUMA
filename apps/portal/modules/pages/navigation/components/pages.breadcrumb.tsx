'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { PageSummary } from '../../types/pages.types';
import { resolveBreadcrumbLabel, splitBreadcrumbParentPages } from '../lib/pages.breadcrumb.lib';

interface IProps {
  readonly parentPages: readonly PageSummary[];
  readonly spaceId: string;
  readonly spaceName?: string;
  readonly title: string;
}

export const PagesBreadcrumb = ({ parentPages, spaceId, spaceName, title }: IProps) => {
  const t = useTranslations('pages');
  const currentTitle = resolveBreadcrumbLabel(title, t('untitled'));
  const { collapsedParentPages, visibleParentPages } = splitBreadcrumbParentPages(parentPages);

  return (
    <nav aria-label={t('location')} className="min-w-0 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 text-muted-foreground text-xs">
        <li>
          <Link
            className="rounded-none p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={ROUTES.PORTAL_SPACE(spaceId)}
          >
            {resolveBreadcrumbLabel(spaceName, t('spaceRoot'))}
          </Link>
        </li>
        {collapsedParentPages.length > 0 && (
          <li className="flex min-w-0 items-center gap-1">
            <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t('breadcrumb.expandCollapsed')}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-none p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                {t('breadcrumb.collapsedMark')}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {collapsedParentPages.map((parentPage) => (
                  <DropdownMenuItem asChild key={parentPage.id}>
                    <Link href={ROUTES.PORTAL_SPACE_PAGE(spaceId, parentPage.id)}>
                      {resolveBreadcrumbLabel(parentPage.title, t('untitled'))}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )}
        {visibleParentPages.map((parentPage) => (
          <li className="flex min-w-0 items-center gap-1" key={parentPage.id}>
            <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
            <Link
              className="max-w-40 truncate rounded-none p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-56"
              href={ROUTES.PORTAL_SPACE_PAGE(spaceId, parentPage.id)}
              title={resolveBreadcrumbLabel(parentPage.title, t('untitled'))}
            >
              {resolveBreadcrumbLabel(parentPage.title, t('untitled'))}
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
