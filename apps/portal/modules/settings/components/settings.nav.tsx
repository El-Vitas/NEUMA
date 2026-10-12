'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { isSettingsNavItemActive } from '../lib/settings.lib';
import type { SettingsNavItem } from '../types/settings.types';

interface IProps {
  readonly items: readonly SettingsNavItem[];
}

export const SettingsNav = ({ items }: IProps) => {
  const t = useTranslations('settings.nav');
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {items.map((item) => {
          const isActive = isSettingsNavItemActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center whitespace-nowrap border-l-2 px-3 text-sm',
                  FOCUS_RING_CLASS,
                  isActive
                    ? 'border-primary bg-primary/10 font-semibold text-primary'
                    : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                href={item.href}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
