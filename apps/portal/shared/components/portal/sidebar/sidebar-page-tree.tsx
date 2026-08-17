'use client';

import type { UserRole } from '@company-brain/shared';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { usePathname } from '@/i18n/navigation';
import { PagesTrashConfirmDialog } from '@/modules/pages/components/pages.trash.confirm.dialog';
import { restorePageAction } from '@/modules/pages/server/actions/pages.actions';
import {
  buildPortalSidebarPageTree,
  getPortalSidebarExpandedPageIds,
  getPortalSidebarSelectedPageId,
  handleSidebarPageTreeKeyDown,
} from '@/modules/portal/lib/portal.sidebar.lib';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { hasActionError } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { SidebarPageTreeItem } from './sidebar-page-tree-item';

interface IProps {
  readonly id: string;
  readonly onNavigate?: () => void;
  readonly pages: readonly PortalSidebarPage[];
  readonly role: UserRole;
  readonly spaceId: string;
}

export const SidebarPageTree = ({ id, onNavigate, pages, role, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pageToTrash, setPageToTrash] = useState<PortalSidebarPage | null>(null);
  const undoingPageIdRef = useRef<string | null>(null);
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

  const canEdit = canEditContent(role) && !isPending;

  return (
    <>
      <ul aria-label={t('pageTree')} className="space-y-px pb-1" data-page-tree="true" id={id}>
        {tree.map((treeItem) => (
          <SidebarPageTreeItem
            canEdit={canEdit}
            depth={0}
            expandedPageIds={expandedPageIds}
            key={treeItem.page.id}
            onKeyDown={handleSidebarPageTreeKeyDown}
            onNavigate={onNavigate}
            onRequestTrash={requestTrash}
            onToggle={togglePage}
            selectedPageId={selectedPageId}
            spaceId={spaceId}
            treeItem={treeItem}
          />
        ))}
      </ul>
      <PagesTrashConfirmDialog
        onClose={() => setPageToTrash(null)}
        onTrashed={handlePageTrashed}
        page={pageToTrash === null ? null : { id: pageToTrash.id, title: pageToTrash.title }}
        spaceId={spaceId}
      />
    </>
  );
};
