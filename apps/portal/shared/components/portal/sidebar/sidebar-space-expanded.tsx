'use client';

import type { UserRole } from '@company-brain/shared';
import { BookOpen, ChevronRight, MoreHorizontal, PenLine, Plus, Smile } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { usePagesStart } from '@/modules/pages/hooks/use.pages.start';
import { getVisiblePortalSidebarPages } from '@/modules/portal/lib/portal.sidebar.lib';
import type { PortalLayoutSpace } from '@/modules/portal/types/portal.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { useSidebarSpaceDrop } from '@/shared/hooks/use.sidebar-space-drop.hook';
import { SidebarPageTree } from './sidebar-page-tree';
import { SidebarSpaceIconDialog } from './sidebar-space-icon-dialog';
import { SidebarSpaceKindMark } from './sidebar-space-kind-mark';
import { SidebarSpaceRenameDialog } from './sidebar-space-rename-dialog';
import { SidebarTreeIcon } from './sidebar-tree-icon';

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
  const router = useRouter();
  const { isStarting, startPage } = usePagesStart();
  const spaceDrop = useSidebarSpaceDrop();
  const [isIconDialogOpen, setIsIconDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const hasPages = getVisiblePortalSidebarPages(space.pages).length > 0;
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
            'data-[sidebar-page-drop-target=true]:bg-primary/15 data-[sidebar-page-drop-target=true]:outline data-[sidebar-page-drop-target=true]:outline-primary/60',
            spaceDrop.draggedSpaceId === space.id && 'opacity-40',
          )}
          draggable={canCreatePages}
          href={spacePath}
          onClick={onNavigate}
          onDragEnd={spaceDrop.handleSpaceDragEnd}
          onDragOver={spaceDrop.handleSpaceDragOver}
          onDragStart={(event) => spaceDrop.handleSpaceDragStart(event, space.id)}
          onDrop={(event) => spaceDrop.handleSpaceDrop(event, space.id)}
        >
          {isCurrentSpace && <span aria-hidden="true" className="absolute inset-y-2 -left-8 w-1 bg-primary" />}
          <SidebarTreeIcon fallback={BookOpen} icon={space.icon} />
          <span className="min-w-0 truncate">{space.name}</span>
          <SidebarSpaceKindMark kind={space.kind} />
        </Link>
        {canCreatePages && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('spaceActions', { name: space.name })}
              className={cn(
                'grid size-11 shrink-0 place-items-center text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:opacity-0 lg:group-hover/space:opacity-100 lg:focus-visible:opacity-100',
                FOCUS_RING_CLASS,
              )}
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right">
              <DropdownMenuItem onSelect={() => setIsRenameDialogOpen(true)}>
                <PenLine aria-hidden="true" className="size-4" />
                {t('renameSpace')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsIconDialogOpen(true)}>
                <Smile aria-hidden="true" className="size-4" />
                {t('changeSpaceIcon')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canCreatePages && (
          <button
            aria-label={pagesT('createPage')}
            className={cn(
              'grid size-11 shrink-0 place-items-center text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:opacity-0 lg:group-hover/space:opacity-100 lg:focus-visible:opacity-100',
              FOCUS_RING_CLASS,
            )}
            disabled={isStarting}
            onClick={() => {
              onNavigate?.();
              startPage(space.id);
            }}
            title={pagesT('createPage')}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
      {hasPages && isExpanded && (
        <SidebarPageTree id={childrenId} onNavigate={onNavigate} pages={space.pages} role={role} spaceId={space.id} />
      )}
      {isIconDialogOpen && (
        <SidebarSpaceIconDialog
          onChanged={() => router.refresh()}
          onClose={() => setIsIconDialogOpen(false)}
          space={{ icon: space.icon, id: space.id, name: space.name }}
        />
      )}
      {isRenameDialogOpen && (
        <SidebarSpaceRenameDialog
          onClose={() => setIsRenameDialogOpen(false)}
          onRenamed={() => router.refresh()}
          space={{ id: space.id, name: space.name }}
        />
      )}
    </div>
  );
};
