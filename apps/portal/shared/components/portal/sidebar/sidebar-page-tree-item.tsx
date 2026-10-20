'use client';

import {
  ChevronRight,
  Copy,
  Download,
  FileText,
  Link2,
  MoreHorizontal,
  PenLine,
  Plus,
  Smile,
  Table2,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { PagesSharingBadge } from '@/modules/pages/sharing/components/pages.sharing.badge';
import { buildSidebarTreeIndent, isPortalSidebarPageMoveShortcut } from '@/modules/portal/lib/portal.sidebar.lib';
import type { PortalSidebarPageDragController } from '@/modules/portal/types/portal.sidebar.drag.types';
import type { PortalSidebarPage, PortalSidebarPageTreeItem } from '@/modules/portal/types/portal.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { useCopyPageLink } from '@/shared/hooks/use.copy-page-link.hook';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SidebarPageTreeItemCheckbox } from './sidebar-page-tree-item-checkbox';
import { SidebarTreeIcon } from './sidebar-tree-icon';

interface IProps {
  readonly canEdit: boolean;
  readonly depth: number;
  readonly drag: PortalSidebarPageDragController;
  readonly expandedPageIds: ReadonlySet<string>;
  readonly isExporting: boolean;
  readonly onKeyDown: (event: KeyboardEvent<HTMLAnchorElement>) => void;
  readonly onNavigate?: () => void;
  readonly onRequestChildCollection: (page: PortalSidebarPage) => void;
  readonly onRequestChildPage: (page: PortalSidebarPage) => void;
  readonly onRequestDuplicate: (page: PortalSidebarPage, hasChildren: boolean) => void;
  readonly onRequestExport: (page: PortalSidebarPage, hasChildren: boolean) => void;
  readonly onRequestIcon: (page: PortalSidebarPage) => void;
  readonly onRequestRename: (page: PortalSidebarPage) => void;
  readonly onRequestTrash: (page: PortalSidebarPage) => void;
  readonly onToggle: (pageId: string) => void;
  readonly onToggleSelected: (pageId: string) => void;
  readonly selectedPageId: string | null;
  readonly selectedPageIds: ReadonlySet<string>;
  readonly selectionMode: boolean;
  readonly spaceId: string;
  readonly treeItem: PortalSidebarPageTreeItem;
}

export const SidebarPageTreeItem = ({
  canEdit,
  depth,
  drag,
  expandedPageIds,
  isExporting,
  onKeyDown,
  onNavigate,
  onRequestChildCollection,
  onRequestChildPage,
  onRequestDuplicate,
  onRequestExport,
  onRequestIcon,
  onRequestRename,
  onRequestTrash,
  onToggle,
  onToggleSelected,
  selectedPageId,
  selectedPageIds,
  selectionMode,
  spaceId,
  treeItem,
}: IProps) => {
  const t = useTranslations('pages');
  const tDuplicate = useTranslations('pages.duplicate');
  const tExport = useTranslations('pages.export');
  const copyPageLink = useCopyPageLink();
  const { children, page } = treeItem;
  const pageTitle = page.title.length > 0 ? page.title : t('untitled');
  const hasChildren = children.length > 0;
  const isExpanded = expandedPageIds.has(page.id);
  const isSelected = selectedPageId === page.id;
  const isActive = page.lifecycle === 'ACTIVE';
  const isDraggable = canEdit && isActive && !selectionMode;
  const isPickedForSelection = selectedPageIds.has(page.id);
  const childrenId = `sidebar-page-children-${page.id}`;

  const handleLinkKeyDown = (event: KeyboardEvent<HTMLAnchorElement>): void => {
    const move = isDraggable ? isPortalSidebarPageMoveShortcut(event) : null;
    if (move !== null) {
      event.preventDefault();
      drag.moveByKeyboard(page, move);
      return;
    }
    onKeyDown(event);
  };

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (selectionMode) {
      event.preventDefault();
      onToggleSelected(page.id);
      return;
    }
    onNavigate?.();
  };

  return (
    <li data-page-tree-item="true">
      <div
        className={cn(
          'group/page relative flex min-h-11 items-center pr-1',
          'data-[page-drop-over=true]:bg-primary/15 data-[page-drop-over=true]:outline data-[page-drop-over=true]:outline-primary/60',
        )}
        data-page-drop-target={isDraggable ? page.id : undefined}
        style={{ paddingLeft: `${buildSidebarTreeIndent(depth)}px` }}
      >
        {hasChildren ? (
          <button
            aria-controls={childrenId}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('collapsePage', { name: pageTitle }) : t('expandPage', { name: pageTitle })}
            className={cn(
              'grid min-h-11 min-w-11 shrink-0 place-items-center text-sidebar-foreground/55 hover:text-sidebar-foreground',
              FOCUS_RING_CLASS,
            )}
            data-page-tree-toggle="true"
            onClick={() => onToggle(page.id)}
            type="button"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn('size-3.5 transition-transform', isExpanded && 'rotate-90')}
            />
          </button>
        ) : (
          <span aria-hidden="true" className="w-4 shrink-0" />
        )}
        {selectionMode && isActive && (
          <SidebarPageTreeItemCheckbox
            isPicked={isPickedForSelection}
            onToggle={() => onToggleSelected(page.id)}
            pageTitle={pageTitle}
          />
        )}
        <Link
          aria-current={isSelected ? 'page' : undefined}
          className={cn(
            'relative flex min-h-11 min-w-0 flex-1 items-center gap-1.5 px-1 text-sidebar-foreground/65 text-sm hover:bg-sidebar-accent hover:text-sidebar-foreground',
            FOCUS_RING_CLASS,
            isSelected && 'bg-sidebar-accent font-medium text-sidebar-foreground',
            'data-[sidebar-page-drop-target=nest]:bg-primary/15 data-[sidebar-page-drop-target=nest]:outline data-[sidebar-page-drop-target=nest]:outline-primary/60',
            'data-[sidebar-page-drop-target=before]:shadow-[inset_0_2px_0_0_var(--color-primary)]',
            'data-[sidebar-page-drop-target=after]:shadow-[inset_0_-2px_0_0_var(--color-primary)]',
            drag.draggedPageId === page.id && 'opacity-40',
          )}
          data-page-tree-link="true"
          draggable={isDraggable}
          href={ROUTES.PORTAL_SPACE_PAGE(spaceId, page.id)}
          onClick={handleLinkClick}
          onDragEnd={drag.handleDragEnd}
          onDragOver={(event) => drag.handleRowDragOver(event, page)}
          onDragStart={(event) => drag.handleDragStart(event, page)}
          onDrop={(event) => drag.handleRowDrop(event, page)}
          onKeyDown={handleLinkKeyDown}
          title={pageTitle}
        >
          {isSelected && <span aria-hidden="true" className="absolute inset-y-1 left-0 w-0.5 bg-primary" />}
          <SidebarTreeIcon fallback={FileText} icon={page.icon} />
          <span className="min-w-0 truncate">{pageTitle}</span>
          <PagesSharingBadge isVisible={page.hasOwnPermissions === true} scope="page" />
        </Link>
        {canEdit && !selectionMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={t('pageActions', { name: pageTitle })}
                className={cn(
                  'grid size-11 shrink-0 place-items-center text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:opacity-0 lg:group-hover/page:opacity-100 lg:focus-visible:opacity-100',
                  FOCUS_RING_CLASS,
                )}
                type="button"
              >
                <MoreHorizontal aria-hidden="true" className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isActive && (
                <>
                  <DropdownMenuItem onSelect={() => onRequestChildPage(page)}>
                    <Plus aria-hidden="true" className="size-4" />
                    {t('createChildPage')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onRequestChildCollection(page)}>
                    <Table2 aria-hidden="true" className="size-4" />
                    {t('createChildCollection')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onRequestDuplicate(page, hasChildren)}>
                    <Copy aria-hidden="true" className="size-4" />
                    {tDuplicate('action')}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onSelect={() => void copyPageLink(spaceId, page.id)}>
                <Link2 aria-hidden="true" className="size-4" />
                {t('copyPageLink')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRequestRename(page)}>
                <PenLine aria-hidden="true" className="size-4" />
                {t('renamePage')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRequestIcon(page)}>
                <Smile aria-hidden="true" className="size-4" />
                {t('changeIcon')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isExporting} onSelect={() => onRequestExport(page, hasChildren)}>
                <Download aria-hidden="true" className="size-4" />
                {tExport('action')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRequestTrash(page)}>
                <Trash2 aria-hidden="true" className="size-4" />
                {t('trashNamed', { name: pageTitle })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {hasChildren && isExpanded && (
        <ul id={childrenId}>
          {children.map((child) => (
            <SidebarPageTreeItem
              canEdit={canEdit}
              depth={depth + 1}
              drag={drag}
              expandedPageIds={expandedPageIds}
              isExporting={isExporting}
              key={child.page.id}
              onKeyDown={onKeyDown}
              onNavigate={onNavigate}
              onRequestChildCollection={onRequestChildCollection}
              onRequestChildPage={onRequestChildPage}
              onRequestDuplicate={onRequestDuplicate}
              onRequestExport={onRequestExport}
              onRequestIcon={onRequestIcon}
              onRequestRename={onRequestRename}
              onRequestTrash={onRequestTrash}
              onToggle={onToggle}
              onToggleSelected={onToggleSelected}
              selectedPageId={selectedPageId}
              selectedPageIds={selectedPageIds}
              selectionMode={selectionMode}
              spaceId={spaceId}
              treeItem={child}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
