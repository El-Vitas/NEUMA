'use client';

import type { UserRole } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_TRANSITION_DURATION_MS,
} from '@/modules/portal/constants/sidebar.constants';
import { useSidebarCollapsed } from '@/modules/portal/hooks/use.sidebar.collapsed';
import type { PortalLayoutSpace, PortalLayoutUser } from '@/modules/portal/types/portal.types';
import type { ThemeChoice } from '@/shared/types/theme.types';
import { SidebarAccount } from './sidebar-account';
import { SidebarBrand } from './sidebar-brand';
import { SidebarNav } from './sidebar-nav';
import { SidebarSpaces } from './sidebar-spaces';
import { SidebarToggle } from './sidebar-toggle';

interface SidebarProps {
  readonly role: UserRole;
  readonly themeChoice: ThemeChoice;
  readonly onNavigate?: () => void;
  readonly spaces: readonly PortalLayoutSpace[];
  readonly user: PortalLayoutUser;
  readonly enableCollapsing?: boolean;
  readonly enableKeyboardShortcut?: boolean;
}

export const Sidebar = ({
  role,
  onNavigate,
  spaces,
  themeChoice,
  user,
  enableCollapsing = true,
  enableKeyboardShortcut = true,
}: SidebarProps) => {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed(enableKeyboardShortcut);
  const t = useTranslations('navigation');
  const isCollapsed = enableCollapsing && collapsed;

  return (
    <aside
      aria-label={t('mobileMenu')}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-sidebar-border border-r bg-sidebar transition-[width]',
        isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
      )}
      style={{ transitionDuration: `${SIDEBAR_TRANSITION_DURATION_MS}ms` }}
    >
      <div className={cn('relative z-10 border-sidebar-border border-b p-4', isCollapsed && 'px-2')}>
        <SidebarBrand collapsed={isCollapsed} />
      </div>

      <SidebarNav collapsed={isCollapsed} onNavigate={onNavigate} role={role} />
      <SidebarSpaces collapsed={isCollapsed} onNavigate={onNavigate} role={role} spaces={spaces} />
      <SidebarAccount collapsed={isCollapsed} themeChoice={themeChoice} user={user} />

      {enableCollapsing && <SidebarToggle collapsed={isCollapsed} onToggle={toggleCollapsed} />}
    </aside>
  );
};
