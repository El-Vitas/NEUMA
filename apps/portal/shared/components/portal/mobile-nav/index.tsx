'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { filterNavItemsByRole } from '@/modules/portal/lib/portal.nav.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { MobileNavItem } from './mobile-nav-item';
import type { MobileNavProps } from './types/mobile-nav.types';

export const MobileNav = ({ role, onNavigate }: MobileNavProps) => {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  return (
    <nav className="flex flex-col gap-1 p-4">
      {filterNavItemsByRole(role).map((item) => {
        const isActive = pathname === item.href || (item.href !== ROUTES.PORTAL && pathname.startsWith(item.href));
        return (
          <MobileNavItem
            active={isActive}
            href={item.href}
            icon={item.icon}
            key={item.href}
            label={t(item.labelKey)}
            onClick={onNavigate}
          />
        );
      })}
    </nav>
  );
};
