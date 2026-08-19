'use client';

import type { UserRole } from '@company-brain/shared';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { usePathname } from '@/i18n/navigation';
import { PagesDuplicateChildrenDialog } from '@/modules/pages/components/pages.duplicate.children.dialog';
import { PagesTrashConfirmDialog } from '@/modules/pages/components/pages.trash.confirm.dialog';
import { usePagesStart } from '@/modules/pages/hooks/use.pages.start';
import { duplicatePageAction, restorePageAction } from '@/modules/pages/server/actions/pages.actions';
import {
  buildPortalSidebarPageTree,
  getPortalSidebarExpandedPageIds,
  getPortalSidebarSelectedPageId,
  handleSidebarPageTreeKeyDown,
} from '@/modules/portal/lib/portal.sidebar.lib';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { useSidebarPageDrag } from '@/shared/hooks/use.sidebar-page-drag.hook';
import { hasActionError } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SidebarPageIconDialog } from './sidebar-page-icon-dialog';
import { SidebarPageRenameDialog } from './sidebar-page-rename-dialog';
import { SidebarPageTreeItem } from './sidebar-page-tree-item';
import { SidebarPageTreeRootDropZone } from './sidebar-page-tree-root-drop-zone';

interface IProps {
  readonly id: string;
  readonly onNavigate?: () => void;
  readonly pages: readonly PortalSidebarPage[];
  readonly role: UserRole;
  readonly spaceId: string;
}

export const SidebarPageTree = ({ id, onNavigate, pages, role, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const tDuplicate = useTranslations('pages.duplicate');
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { isStarting, startPage } = usePagesStart();
  const [pageToTrash, setPageToTrash] = useState<PortalSidebarPage | null>(null);
  const [pageToRename, setPageToRename] = useState<PortalSidebarPage | null>(null);
  const [pageToMark, setPageToMark] = useState<PortalSidebarPage | null>(null);
  const [pageToDuplicate, setPageToDuplicate] = useState<PortalSidebarPage | null>(null);
  const undoingPageIdRef = useRef<string | null>(null);
  const drag = useSidebarPageDrag(pages, spaceId);
  const tree = useMemo(() => buildPortalSidebarPageTree(pages), [pages]);
  const spacePath = ROUTES.PORTAL_SPACE(spaceId);
  const selectedPageId = useMemo(
    () => getPortalSidebarSelectedPageId(pathname, pages, spacePath),
    [pages, pathname, spacePath],
  );
  const selectedPathIds = useMemo(() => getPortalSidebarExpandedPageIds(tree, selectedPageId), [selectedPageId, tree]);
  const expansionKey = `${pathname}:${selectedPathIds.join(':')}`;
  const [expansionState, setExpansionState] = useState(() => ({
    key: expansionKey,
    pageIds: new Set(selectedPathIds),
  }));
  const expandedPageIds =
    expansionState.key === expansionKey
      ? expansionState.pageIds
      : new Set([...expansionState.pageIds, ...selectedPathIds]);

  const togglePage = (pageId: string): void => {
    setExpansionState(() => {
      const next = new Set(expandedPageIds);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return { key: expansionKey, pageIds: next };
    });
  };

  const restorePage = (page: PortalSidebarPage): void => {
    if (undoingPageIdRef.current === page.id) return;
    undoingPageIdRef.current = page.id;
    startTransition(async () => {
      try {
        const result = await restorePageAction({ pageId: page.id, spaceId });
        if (hasActionError(result)) {
          toast.error(t('permissionError'));
          return;
        }
        toast.success(t('restored'));
        router.refresh();
      } catch {
        toast.error(t('permissionError'));
      } finally {
        undoingPageIdRef.current = null;
      }
    });
  };

  const duplicatePage = (page: PortalSidebarPage, includeChildren: boolean): void => {
    setPageToDuplicate(null);
    startTransition(async () => {
      const result = await duplicatePageAction({
        includeChildren,
        pageId: page.id,
        spaceId,
        title: tDuplicate('copyName', { title: page.title.length > 0 ? page.title : t('untitled') }),
      });
      if (hasActionError(result)) {
        toast.error(tDuplicate('error'));
        return;
      }
      toast.success(tDuplicate('done'));
      router.refresh();
    });
  };

  /** A page with nothing under it leaves nothing to decide, so nothing is asked. */
  const requestDuplicate = (page: PortalSidebarPage, hasChildren: boolean): void => {
    if (hasChildren) {
      setPageToDuplicate(page);
      return;
    }
    duplicatePage(page, false);
  };

  const requestTrash = (page: PortalSidebarPage): void => {
    setPageToTrash(page);
  };

  const handlePageTrashed = (): void => {
    const trashedPage = pageToTrash;
    setPageToTrash(null);
    if (trashedPage === null) return;
    toast.success(t('trashed'), {
      action: {
        label: t('commands.undo'),
        onClick: () => restorePage(trashedPage),
      },
    });
    router.refresh();
  };

  const canEdit = canEditContent(role) && !isPending && !isStarting;

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {drag.announcement}
      </div>
      <ul aria-label={t('pageTree')} className="space-y-px pb-1" data-page-tree="true" id={id}>
        {tree.map((treeItem) => (
          <SidebarPageTreeItem
            canEdit={canEdit}
            depth={0}
            drag={drag}
            expandedPageIds={expandedPageIds}
            key={treeItem.page.id}
            onKeyDown={handleSidebarPageTreeKeyDown}
            onNavigate={onNavigate}
            onRequestChildPage={(page) => startPage(spaceId, page.id)}
            onRequestDuplicate={requestDuplicate}
            onRequestIcon={setPageToMark}
            onRequestRename={setPageToRename}
            onRequestTrash={requestTrash}
            onToggle={togglePage}
            selectedPageId={selectedPageId}
            spaceId={spaceId}
            treeItem={treeItem}
          />
        ))}
      </ul>
      {canEdit && drag.draggedPageId !== null && (
        <SidebarPageTreeRootDropZone onDragOver={drag.handleRootDragOver} onDrop={drag.handleRootDrop} />
      )}
      {pageToRename !== null && (
        <SidebarPageRenameDialog
          onClose={() => setPageToRename(null)}
          onRenamed={() => router.refresh()}
          page={{ id: pageToRename.id, title: pageToRename.title }}
          spaceId={spaceId}
        />
      )}
      {pageToMark !== null && (
        <SidebarPageIconDialog
          onChanged={() => router.refresh()}
          onClose={() => setPageToMark(null)}
          page={{ icon: pageToMark.icon, id: pageToMark.id, title: pageToMark.title }}
          spaceId={spaceId}
        />
      )}
      {pageToDuplicate !== null && (
        <PagesDuplicateChildrenDialog
          onClose={() => setPageToDuplicate(null)}
          onConfirm={(includeChildren) => duplicatePage(pageToDuplicate, includeChildren)}
          open
          title={pageToDuplicate.title.length > 0 ? pageToDuplicate.title : t('untitled')}
        />
      )}
      <PagesTrashConfirmDialog
        onClose={() => setPageToTrash(null)}
        onTrashed={handlePageTrashed}
        page={pageToTrash === null ? null : { id: pageToTrash.id, title: pageToTrash.title }}
        spaceId={spaceId}
      />
    </>
  );
};
