'use client';

import type { UserRole } from '@company-brain/shared';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { filterNavSectionsByRole } from '@/modules/portal/lib/portal.nav.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SidebarNavItem } from './sidebar-nav-item';

interface SidebarNavProps {
  readonly collapsed: boolean;
  readonly role: UserRole;
  readonly onNavigate?: () => void;
}

export const SidebarNav = ({ collapsed, role, onNavigate }: SidebarNavProps) => {
  const pathname = usePathname();

  const isItemActive = (href: string) => pathname === href || (href !== ROUTES.PORTAL && pathname.startsWith(href));

  return (
    <nav className={cn('flex-1 space-y-3 p-2', collapsed && 'space-y-2 p-1')}>
      {filterNavSectionsByRole(role).map((section) => (
        <div key={section.label}>
          {!collapsed && (
            <p className="px-3 pb-1 font-semibold text-[11px] text-sidebar-foreground/50 uppercase tracking-wide">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <SidebarNavItem
                collapsed={collapsed}
                isActive={isItemActive(item.href)}
                item={item}
                key={item.href}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
};
