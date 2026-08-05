'use client';

import type { UserRole } from '@company-brain/shared';
import { BookOpen, ChevronRight, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { PortalLayoutSpace } from '@/modules/portal/types/portal.types';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SidebarPageTree } from './sidebar-page-tree';

interface IProps {
  readonly canCreatePages: boolean;
  readonly isCurrentSpace: boolean;
  readonly isExpanded: boolean;
  readonly onNavigate?: () => void;
  readonly onToggle: () => void;
  readonly role: UserRole;
  readonly space: PortalLayoutSpace;
  readonly spacePath: string;
}

export const SidebarSpaceExpanded = ({
  canCreatePages,
  isCurrentSpace,
  isExpanded,
  onNavigate,
  onToggle,
  role,
  space,
  spacePath,
}: IProps) => {
  const t = useTranslations('navigation');
  const pagesT = useTranslations('pages');
  const hasPages = space.pages.length > 0;
  const childrenId = `sidebar-space-pages-${space.id}`;

  return (
    <div className="group/space">
      <div className={cn('relative flex min-h-10 items-center pr-1', isCurrentSpace && 'bg-sidebar-accent')}>
        {hasPages ? (
          <button
            aria-controls={childrenId}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('collapseSpace', { name: space.name }) : t('expandSpace', { name: space.name })}
            className={cn(
              'grid min-h-11 min-w-8 place-items-center text-sidebar-foreground/60 hover:text-sidebar-foreground',
              FOCUS_RING_CLASS,
            )}
            onClick={onToggle}
            type="button"
          >
            <ChevronRight aria-hidden="true" className={cn('size-4 transition-transform', isExpanded && 'rotate-90')} />
          </button>
        ) : (
          <span aria-hidden="true" className="w-8" />
        )}
        <Link
          aria-current={isCurrentSpace ? 'page' : undefined}
          className={cn(
            'relative flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sidebar-foreground/80 text-sm hover:text-sidebar-foreground',
            FOCUS_RING_CLASS,
            isCurrentSpace && 'font-medium text-sidebar-foreground',
          )}
          href={spacePath}
          onClick={onNavigate}
        >
          {isCurrentSpace && <span aria-hidden="true" className="absolute inset-y-2 -left-8 w-1 bg-primary" />}
          <BookOpen aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{space.name}</span>
        </Link>
        {canCreatePages && (
          <Link
            aria-label={pagesT('createPage')}
            className={cn(
              'grid size-11 shrink-0 place-items-center text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:opacity-0 lg:group-hover/space:opacity-100 lg:focus-visible:opacity-100',
              FOCUS_RING_CLASS,
            )}
            href={ROUTES.PORTAL_SPACE_NEW_PAGE(space.id)}
            onClick={onNavigate}
            title={pagesT('createPage')}
          >
            <Plus aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
      {hasPages && isExpanded && (
        <SidebarPageTree id={childrenId} onNavigate={onNavigate} pages={space.pages} role={role} spaceId={space.id} />
      )}
    </div>
  );
};
