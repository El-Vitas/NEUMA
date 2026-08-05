'use client';

import type { UserRole } from '@company-brain/shared';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { PortalLayoutSpace } from '@/modules/portal/types/portal.types';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SidebarSpaceCollapsed } from './sidebar-space-collapsed';
import { SidebarSpaceExpanded } from './sidebar-space-expanded';

interface IProps {
  readonly collapsed: boolean;
  readonly onNavigate?: () => void;
  readonly role: UserRole;
  readonly space: PortalLayoutSpace;
}

export const SidebarSpace = ({ collapsed, onNavigate, role, space }: IProps) => {
  const pathname = usePathname();
  const spacePath = ROUTES.PORTAL_SPACE(space.id);
  const isCurrentSpace = pathname === spacePath;
  const isActiveSpace = pathname === spacePath || pathname.startsWith(`${spacePath}/`);
  const expansionKey = `${pathname}:${isActiveSpace}`;
  const [expansionState, setExpansionState] = useState(() => ({ key: expansionKey, value: isActiveSpace }));
  const isExpanded = expansionState.key === expansionKey ? expansionState.value : expansionState.value || isActiveSpace;

  if (collapsed) {
    return (
      <SidebarSpaceCollapsed
        isActiveSpace={isActiveSpace}
        isCurrentSpace={isCurrentSpace}
        onNavigate={onNavigate}
        spaceName={space.name}
        spacePath={spacePath}
      />
    );
  }

  return (
    <SidebarSpaceExpanded
      canCreatePages={canEditContent(role)}
      isCurrentSpace={isCurrentSpace}
      isExpanded={isExpanded}
      onNavigate={onNavigate}
      onToggle={() => setExpansionState({ key: expansionKey, value: !isExpanded })}
      role={role}
      space={space}
      spacePath={spacePath}
    />
  );
};
