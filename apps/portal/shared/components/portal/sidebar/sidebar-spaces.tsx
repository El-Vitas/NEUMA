'use client';

import type { UserRole } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import type { PortalLayoutSpace } from '@/modules/portal/types/portal.types';
import { SidebarSpace } from './sidebar-space';

interface IProps {
  readonly collapsed: boolean;
  readonly onNavigate?: () => void;
  readonly role: UserRole;
  readonly spaces: readonly PortalLayoutSpace[];
}

export const SidebarSpaces = ({ collapsed, onNavigate, role, spaces }: IProps) => {
  const t = useTranslations('navigation');
  const tPrivacy = useTranslations('spaces.privacy');
  const ownSpaces = spaces.filter((space) => space.kind !== 'shared');
  const sharedSpaces = spaces.filter((space) => space.kind === 'shared');

  const renderSpaces = (listed: readonly PortalLayoutSpace[]) => (
    <div className="space-y-0.5">
      {listed.map((space) => (
        <SidebarSpace collapsed={collapsed} key={space.id} onNavigate={onNavigate} role={role} space={space} />
      ))}
    </div>
  );

  return (
    <section aria-label={t('spaces')} className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
      {!collapsed && (
        <div className="flex items-center justify-between gap-1 px-1 py-2">
          <h2 className="px-2 font-semibold text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.12em]">
            {t('spaces')}
          </h2>
        </div>
      )}
      {renderSpaces(ownSpaces)}
      {sharedSpaces.length > 0 && (
        <>
          {!collapsed && (
            <h2 className="px-3 pt-4 pb-2 font-semibold text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.12em]">
              {tPrivacy('treeShared')}
            </h2>
          )}
          {renderSpaces(sharedSpaces)}
        </>
      )}
    </section>
  );
};
