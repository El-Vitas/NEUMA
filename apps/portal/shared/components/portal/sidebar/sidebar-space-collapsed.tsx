'use client';

import type { PageIcon } from '@neuma/shared';
import { BookOpen } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { SidebarTreeIcon } from './sidebar-tree-icon';

interface IProps {
  readonly icon: null | PageIcon;
  readonly isActiveSpace: boolean;
  readonly isCurrentSpace: boolean;
  readonly onNavigate?: () => void;
  readonly spaceName: string;
  readonly spacePath: string;
}

export const SidebarSpaceCollapsed = ({
  icon,
  isActiveSpace,
  isCurrentSpace,
  onNavigate,
  spaceName,
  spacePath,
}: IProps) => (
  <Link
    aria-current={isCurrentSpace ? 'page' : undefined}
    aria-label={spaceName}
    className={cn(
      'group relative mx-auto flex size-11 items-center justify-center text-sidebar-foreground/70',
      FOCUS_RING_CLASS,
      isActiveSpace && 'bg-sidebar-accent text-sidebar-foreground',
    )}
    href={spacePath}
    onClick={onNavigate}
    title={spaceName}
  >
    {isActiveSpace && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 bg-primary" />}
    <SidebarTreeIcon className="size-4" fallback={BookOpen} icon={icon} />
  </Link>
);
