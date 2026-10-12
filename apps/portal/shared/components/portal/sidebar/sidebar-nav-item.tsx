'use client';

import { cn } from '@/lib/utils';
import { SIDEBAR_HOVER_CLASS } from '@/modules/portal/constants/sidebar.constants';
import type { PortalNavItem } from '@/modules/portal/types/portal.types';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { Link } from '../../../../i18n/navigation';

interface IProps {
  readonly item: PortalNavItem & { readonly label: string };
  readonly isActive: boolean;
  readonly collapsed: boolean;
  readonly onNavigate?: () => void;
}

export const SidebarNavItem = ({ item, isActive, collapsed, onNavigate }: IProps) => (
  <Link
    aria-current={isActive ? 'page' : undefined}
    aria-label={collapsed ? item.label : undefined}
    className={cn(
      'group relative flex items-center gap-3 rounded-none px-3 py-2 font-semibold text-sm',
      FOCUS_RING_CLASS,
      collapsed ? 'mx-auto size-11 justify-center px-0' : '',
      isActive
        ? 'bg-primary/15 text-primary'
        : cn('text-sidebar-foreground/70', SIDEBAR_HOVER_CLASS, 'hover:text-sidebar-foreground'),
    )}
    href={item.href}
    onClick={onNavigate}
    title={collapsed ? item.label : undefined}
  >
    {isActive && (
      <span aria-hidden="true" className="absolute inset-y-0 left-0 my-auto h-6 w-1.5 rounded-r bg-primary" />
    )}
    <item.icon aria-hidden="true" className="size-5 shrink-0" />
    {!collapsed && <span>{item.label}</span>}
  </Link>
);
