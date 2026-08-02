'use client';

import type { UserRole } from '@company-brain/shared';
import { cn } from '@/lib/utils';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_STRIPE_COLORS,
  SIDEBAR_TRANSITION_DURATION_MS,
} from '@/modules/portal/constants/sidebar.constants';
import { useSidebarCollapsed } from '@/modules/portal/hooks/use.sidebar.collapsed';
import { useTheme } from '@/shared/components/ui/theme-provider';
import { SidebarBrand } from './sidebar-brand';
import { SidebarNav } from './sidebar-nav';
import { SidebarToggle } from './sidebar-toggle';

interface SidebarProps {
  readonly role: UserRole;
  readonly onNavigate?: () => void;
}

export const Sidebar = ({ role, onNavigate }: SidebarProps) => {
  const { isDark } = useTheme();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  const palette = isDark ? SIDEBAR_STRIPE_COLORS.dark : SIDEBAR_STRIPE_COLORS.light;

  return (
    <aside
      className={cn(
        'relative flex h-full shrink-0 flex-col border-sidebar-border border-r transition-[width]',
        collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
      )}
      style={{
        transitionDuration: `${SIDEBAR_TRANSITION_DURATION_MS}ms`,
        backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 2px, ${palette.stripe} 2px, ${palette.stripe} 4px)`,
      }}
    >
      <div className={cn('relative z-10 border-sidebar-border border-b p-4', collapsed && 'px-2')}>
        <SidebarBrand collapsed={collapsed} />
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} role={role} />

      <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
    </aside>
  );
};
