'use client';

import type { UserRole } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FavoritesSection } from '@/modules/favorites/components/favorites.section';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_TRANSITION_DURATION_MS,
} from '@/modules/portal/constants/sidebar.constants';
import { useSidebarCollapsed } from '@/modules/portal/hooks/use.sidebar.collapsed';
import { useSidebarTreePanel } from '@/modules/portal/hooks/use.sidebar.tree-panel';
import type { PortalLayoutSpace, PortalLayoutUser } from '@/modules/portal/types/portal.types';
import type { FavoritePage } from '@/shared/types/favorites.types';
import type { ThemeChoice } from '@/shared/types/theme.types';
import { SidebarAccount } from './sidebar-account';
import { SidebarBrand } from './sidebar-brand';
import { SidebarNav } from './sidebar-nav';
import { SidebarSpaces } from './sidebar-spaces';
import { SidebarToggle } from './sidebar-toggle';
import { SidebarTreeResizeHandle } from './sidebar-tree-resize-handle';

interface SidebarProps {
  readonly favorites: readonly FavoritePage[];
  readonly role: UserRole;
  readonly themeChoice: ThemeChoice;
  readonly onNavigate?: () => void;
  readonly spaces: readonly PortalLayoutSpace[];
  readonly user: PortalLayoutUser;
  readonly enableCollapsing?: boolean;
  readonly enableKeyboardShortcut?: boolean;
}

export const Sidebar = ({
  favorites,
  role,
  onNavigate,
  spaces,
  themeChoice,
  user,
  enableCollapsing = true,
  enableKeyboardShortcut = true,
}: SidebarProps) => {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed(enableKeyboardShortcut);
  const treePanel = useSidebarTreePanel();
  const t = useTranslations('navigation');
  const isCollapsed = enableCollapsing && collapsed;
  const canResizeTree = enableCollapsing && !isCollapsed;

  return (
    <aside
      aria-label={t('mobileMenu')}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-sidebar-border border-r bg-sidebar transition-[width] motion-reduce:transition-none',
        isCollapsed && SIDEBAR_COLLAPSED_WIDTH,
        /** Standing in a panel that cannot be folded away means the panel already decided how wide this is, and any width of its own would leave a bare strip beside it. */
        !isCollapsed && !enableCollapsing && 'w-full',
        !isCollapsed && enableCollapsing && !canResizeTree && SIDEBAR_EXPANDED_WIDTH,
      )}
      style={{
        transitionDuration: `${SIDEBAR_TRANSITION_DURATION_MS}ms`,
        ...(canResizeTree ? { width: treePanel.width } : {}),
      }}
    >
      <div className={cn('relative z-10 border-sidebar-border border-b p-4', isCollapsed && 'px-2')}>
        <SidebarBrand collapsed={isCollapsed} />
      </div>

      <SidebarNav collapsed={isCollapsed} onNavigate={onNavigate} role={role} />
      {!isCollapsed && <FavoritesSection favorites={favorites} onNavigate={onNavigate} />}
      <SidebarSpaces collapsed={isCollapsed} onNavigate={onNavigate} role={role} spaces={spaces} />
      <SidebarAccount collapsed={isCollapsed} themeChoice={themeChoice} user={user} />

      {enableCollapsing && <SidebarToggle collapsed={isCollapsed} onToggle={toggleCollapsed} />}
      {canResizeTree && (
        <SidebarTreeResizeHandle
          onChangeWidth={treePanel.handleWidthChange}
          onPointerDown={treePanel.startResizing}
          width={treePanel.width}
        />
      )}
    </aside>
  );
};
