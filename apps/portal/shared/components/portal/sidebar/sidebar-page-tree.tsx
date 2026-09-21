'use client';

import { canEditContent, type UserRole } from '@company-brain/shared';
import { ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { PagesChildrenQuestionDialog } from '@/modules/pages/components/pages.children.question.dialog';
import { usePagesExport } from '@/modules/pages/export/hooks/use.pages.export';
import { duplicatePageAction, restorePageAction } from '@/modules/pages/server/actions/pages.actions';
import { PagesTrashConfirmDialog } from '@/modules/pages/trash/components/pages.trash.confirm.dialog';
import { usePageRestoreNotice } from '@/modules/pages/trash/hooks/use.pages.trash.restore-notice';
import type { TrashRestoreOutcome } from '@/modules/pages/trash/types/pages.trash.types';
import {
  buildPortalSidebarPageTree,
  getPortalSidebarExpandedPageIds,
  getPortalSidebarSelectedPageId,
  handleSidebarPageTreeKeyDown,
} from '@/modules/portal/lib/portal.sidebar.lib';
import { summarizePortalSidebarSelectionOutcome } from '@/modules/portal/lib/portal.sidebar.selection.lib';
import type { PortalPageBatchOutcome } from '@/modules/portal/types/portal.sidebar.selection.types';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { usePagesStart } from '@/shared/hooks/use.pages-start.hook';
import { useSidebarPageDrag } from '@/shared/hooks/use.sidebar-page-drag.hook';
import { useSidebarPageSelection } from '@/shared/hooks/use.sidebar-page-selection.hook';
import { hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SidebarPageBatchMoveDialog } from './sidebar-page-batch-move-dialog';
import { SidebarPageBatchTrashDialog } from './sidebar-page-batch-trash-dialog';
import { SidebarPageIconDialog } from './sidebar-page-icon-dialog';
import { SidebarPageRenameDialog } from './sidebar-page-rename-dialog';
import { SidebarPageSelectionToolbar } from './sidebar-page-selection-toolbar';
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
  const { isStarting, startCollection, startPage } = usePagesStart();
  const [pageToTrash, setPageToTrash] = useState<PortalSidebarPage | null>(null);
  const [pageToRename, setPageToRename] = useState<PortalSidebarPage | null>(null);
  const [pageToMark, setPageToMark] = useState<PortalSidebarPage | null>(null);
  const [pageToDuplicate, setPageToDuplicate] = useState<PortalSidebarPage | null>(null);
  const [pageToExport, setPageToExport] = useState<PortalSidebarPage | null>(null);
  const { exportPages, isExporting } = usePagesExport();
  const undoingPageIdRef = useRef<string | null>(null);
  const restoreNotice = usePageRestoreNotice();
  const drag = useSidebarPageDrag(pages, spaceId);
  const selection = useSidebarPageSelection();
  const [activeBatchDialog, setActiveBatchDialog] = useState<'move' | 'trash' | null>(null);
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
        if (!isActionSuccess<TrashRestoreOutcome>(result)) {
          toast.error(t('permissionError'));
          return;
        }
        toast.success(restoreNotice(page.title, result.data));
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

  const exportPage = (page: PortalSidebarPage, includeChildren: boolean): void => {
    setPageToExport(null);
    exportPages({
      exportedName: page.title.length > 0 ? page.title : t('untitled'),
      pageId: page.id,
      scope: includeChildren ? 'branch' : 'page',
      spaceId,
    });
  };

  /**
   * What was picked goes out and the selection ends, because leaving it up
   * would invite acting twice on pages that already left.
   */
  const exportSelection = (): void => {
    exportPages({
      exportedName: t('selection.exportName'),
      pageId: null,
      pageIds: [...selection.selectedIds],
      scope: 'pages',
      spaceId,
    });
    selection.stop();
  };

  /** A page with nothing under it leaves nothing to decide, so nothing is asked. */
  const requestExport = (page: PortalSidebarPage, hasChildren: boolean): void => {
    if (hasChildren) {
      setPageToExport(page);
      return;
    }
    exportPage(page, false);
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

  const handleBatchOutcome = (kind: 'move' | 'trash', outcome: PortalPageBatchOutcome): void => {
    const summary = summarizePortalSidebarSelectionOutcome(outcome);
    const doneKey = kind === 'trash' ? 'selection.trashDone' : 'selection.moveDone';
    const partialKey = kind === 'trash' ? 'selection.trashPartial' : 'selection.movePartial';
    if (summary.kind === 'success') toast.success(t(doneKey, { count: summary.succeededCount }));
    else toast.warning(t(partialKey, { failed: summary.failedCount, succeeded: summary.succeededCount }));
    setActiveBatchDialog(null);
    selection.stop();
    router.refresh();
  };

  const selectedPageIdList = [...selection.selectedIds];

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {drag.announcement}
      </div>
      <div aria-live="polite" className="sr-only">
        {selection.announcement}
      </div>
      {canEdit && !selection.isActive && (
        <button
          className={cn(
            'flex min-h-11 w-full items-center gap-2 px-2 text-sidebar-foreground/55 text-xs hover:text-sidebar-foreground',
            FOCUS_RING_CLASS,
          )}
          onClick={selection.start}
          type="button"
        >
          <ListChecks aria-hidden="true" className="size-3.5" />
          {t('selection.enter')}
        </button>
      )}
      {selection.isActive && (
        <SidebarPageSelectionToolbar
          disabled={isPending || isExporting}
          onCancel={selection.stop}
          onExport={exportSelection}
          onMove={() => setActiveBatchDialog('move')}
          onTrash={() => setActiveBatchDialog('trash')}
          selectedCount={selection.selectedIds.size}
        />
      )}
      <ul aria-label={t('pageTree')} className="space-y-px pb-1" data-page-tree="true" id={id}>
        {tree.map((treeItem) => (
          <SidebarPageTreeItem
            canEdit={canEdit}
            depth={0}
            drag={drag}
            expandedPageIds={expandedPageIds}
            isExporting={isExporting}
            key={treeItem.page.id}
            onKeyDown={handleSidebarPageTreeKeyDown}
            onNavigate={onNavigate}
            onRequestChildCollection={(page) => startCollection(spaceId, page.id)}
            onRequestChildPage={(page) => startPage(spaceId, page.id)}
            onRequestDuplicate={requestDuplicate}
            onRequestExport={requestExport}
            onRequestIcon={setPageToMark}
            onRequestRename={setPageToRename}
            onRequestTrash={requestTrash}
            onToggle={togglePage}
            onToggleSelected={selection.toggle}
            selectedPageId={selectedPageId}
            selectedPageIds={selection.selectedIds}
            selectionMode={selection.isActive}
            spaceId={spaceId}
            treeItem={treeItem}
          />
        ))}
      </ul>
      {activeBatchDialog === 'trash' && (
        <SidebarPageBatchTrashDialog
          onClose={() => setActiveBatchDialog(null)}
          onTrashed={(outcome) => handleBatchOutcome('trash', outcome)}
          open
          pageIds={selectedPageIdList}
          spaceId={spaceId}
        />
      )}
      {activeBatchDialog === 'move' && selectedPageIdList.length > 0 && (
        <SidebarPageBatchMoveDialog
          anchorPageId={selectedPageIdList[0]}
          onClose={() => setActiveBatchDialog(null)}
          onMoved={(outcome) => handleBatchOutcome('move', outcome)}
          open
          pageIds={selectedPageIdList}
          spaceId={spaceId}
        />
      )}
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
      {pageToExport !== null && (
        <PagesChildrenQuestionDialog
          namespace="pages.export"
          onClose={() => setPageToExport(null)}
          onConfirm={(includeChildren) => exportPage(pageToExport, includeChildren)}
          open
          title={pageToExport.title.length > 0 ? pageToExport.title : t('untitled')}
        />
      )}
      {pageToDuplicate !== null && (
        <PagesChildrenQuestionDialog
          namespace="pages.duplicate"
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
