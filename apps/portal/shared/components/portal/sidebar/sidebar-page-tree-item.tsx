'use client';

import { ChevronRight, FileText, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { PortalSidebarPage, PortalSidebarPageTreeItem } from '@/modules/portal/types/portal.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface IProps {
  readonly canEdit: boolean;
  readonly depth: number;
  readonly expandedPageIds: ReadonlySet<string>;
  readonly onKeyDown: (event: KeyboardEvent<HTMLAnchorElement>) => void;
  readonly onNavigate?: () => void;
  readonly onRequestTrash: (page: PortalSidebarPage) => void;
  readonly onToggle: (pageId: string) => void;
  readonly selectedPageId: string | null;
  readonly spaceId: string;
  readonly treeItem: PortalSidebarPageTreeItem;
}

export const SidebarPageTreeItem = ({
  canEdit,
  depth,
  expandedPageIds,
  onKeyDown,
  onNavigate,
  onRequestTrash,
  onToggle,
  selectedPageId,
  spaceId,
  treeItem,
}: IProps) => {
  const t = useTranslations('pages');
  const { children, page } = treeItem;
  const hasChildren = children.length > 0;
  const isExpanded = expandedPageIds.has(page.id);
  const isSelected = selectedPageId === page.id;
  const childrenId = `sidebar-page-children-${page.id}`;

  return (
    <li data-page-tree-item="true">
      <div
        className={cn(
          'group/page relative flex min-h-11 items-center pr-1',
          'data-[page-drop-over=true]:bg-primary/15 data-[page-drop-over=true]:outline data-[page-drop-over=true]:outline-primary/60',
        )}
        data-page-drop-target={canEdit && page.lifecycle === 'ACTIVE' ? page.id : undefined}
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
      >
        {hasChildren ? (
          <button
            aria-controls={childrenId}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('collapsePage', { name: page.title }) : t('expandPage', { name: page.title })}
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
        <Link
          aria-current={isSelected ? 'page' : undefined}
          className={cn(
            'relative flex min-h-11 min-w-0 flex-1 items-center gap-1.5 px-1 text-sidebar-foreground/65 text-sm hover:bg-sidebar-accent hover:text-sidebar-foreground',
            FOCUS_RING_CLASS,
            isSelected && 'bg-sidebar-accent font-medium text-sidebar-foreground',
          )}
          data-page-tree-link="true"
          href={ROUTES.PORTAL_SPACE_PAGE(spaceId, page.id)}
          onClick={onNavigate}
          onKeyDown={onKeyDown}
          title={page.title}
        >
          {isSelected && <span aria-hidden="true" className="absolute inset-y-1 left-0 w-0.5 bg-primary" />}
          <FileText aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{page.title}</span>
        </Link>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={t('pageActions', { name: page.title })}
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
              {page.lifecycle === 'ACTIVE' && (
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.PORTAL_SPACE_NEW_CHILD_PAGE(spaceId, page.id)} onClick={onNavigate}>
                    <Plus aria-hidden="true" className="size-4" />
                    {t('createChildPage')}
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => onRequestTrash(page)}>
                <Trash2 aria-hidden="true" className="size-4" />
                {t('trashNamed', { name: page.title })}
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
              expandedPageIds={expandedPageIds}
              key={child.page.id}
              onKeyDown={onKeyDown}
              onNavigate={onNavigate}
              onRequestTrash={onRequestTrash}
              onToggle={onToggle}
              selectedPageId={selectedPageId}
              spaceId={spaceId}
              treeItem={child}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
