'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { DragEvent } from 'react';
import { useCallback, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { movePageAction } from '@/modules/pages/server/actions/pages.actions';
import {
  PORTAL_SIDEBAR_PAGE_DRAG_TYPE,
  PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE,
} from '@/modules/portal/constants/portal.sidebar.drag.constants';
import {
  isPortalSidebarPageDropAllowed,
  markPortalSidebarPageDropTarget,
  resolvePortalSidebarIndentParentId,
  resolvePortalSidebarOutdentParentId,
} from '@/modules/portal/lib/portal.sidebar.drag.lib';
import type {
  PortalSidebarPageDragController,
  PortalSidebarPageDragState,
  PortalSidebarPageKeyboardMove,
} from '@/modules/portal/types/portal.sidebar.drag.types';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';
import { hasActionError } from '@/shared/lib/action-result';

/**
 * Lets a page be dragged onto another to nest, or onto the space's root to
 * leave its parent, and offers the same two moves from the keyboard.
 *
 * The one move the API can express is "give this page a new parent"; it
 * always lands last among that parent's children. There is no "drop before"
 * or "drop after" a sibling — `move()` cannot keep that promise, so the row
 * never makes it: every destination offered here is one the backend can
 * actually hold onto past a reload.
 */
export const useSidebarPageDrag = (
  pages: readonly PortalSidebarPage[],
  spaceId: string,
): PortalSidebarPageDragController => {
  const t = useTranslations('pages.treePanel');
  const pagesT = useTranslations('pages');
  const router = useRouter();
  const [isMoving, startTransition] = useTransition();
  const [dragState, setDragState] = useState<PortalSidebarPageDragState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const lastAnnouncedKey = useRef('');

  const announce = useCallback((key: string, message: string): void => {
    if (lastAnnouncedKey.current === key) return;
    lastAnnouncedKey.current = key;
    setAnnouncement(message);
  }, []);

  const performMove = useCallback(
    (pageId: string, parentId: null | string): void => {
      if (isMoving) return;
      startTransition(async () => {
        const result = await movePageAction({ pageId, parentId, spaceId });
        if (hasActionError(result)) {
          toast.error(pagesT('moveError'));
          return;
        }
        toast.success(pagesT('moved'));
        router.refresh();
      });
    },
    [isMoving, pagesT, router, spaceId],
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLAnchorElement>, page: PortalSidebarPage): void => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', page.id);
      event.dataTransfer.setData(PORTAL_SIDEBAR_PAGE_DRAG_TYPE, JSON.stringify({ pageId: page.id, spaceId }));
      setDragState({ draggedPageId: page.id, draggedPageTitle: page.title });
      lastAnnouncedKey.current = '';
      announce(`dragging:${page.id}`, t('dragging', { name: page.title }));
    },
    [announce, spaceId, t],
  );

  const handleRowDragOver = useCallback(
    (event: DragEvent<HTMLAnchorElement>, targetPage: PortalSidebarPage): void => {
      event.preventDefault();
      event.stopPropagation();
      if (dragState === null) return;
      const allowed = isPortalSidebarPageDropAllowed(pages, dragState.draggedPageId, targetPage.id);
      if (!allowed) {
        event.dataTransfer.dropEffect = 'none';
        markPortalSidebarPageDropTarget(null);
        announce(`invalid:${targetPage.id}`, t('dropInvalid'));
        return;
      }
      event.dataTransfer.dropEffect = 'move';
      markPortalSidebarPageDropTarget(event.currentTarget);
      announce(`inside:${targetPage.id}`, t('dropInside', { name: targetPage.title }));
    },
    [announce, dragState, pages, t],
  );

  const handleRowDrop = useCallback(
    (event: DragEvent<HTMLAnchorElement>, targetPage: PortalSidebarPage): void => {
      event.preventDefault();
      event.stopPropagation();
      markPortalSidebarPageDropTarget(null);
      const draggedPageId = dragState?.draggedPageId;
      setDragState(null);
      if (draggedPageId === undefined || !isPortalSidebarPageDropAllowed(pages, draggedPageId, targetPage.id)) {
        announce(`invalid:${targetPage.id}:drop`, t('dropInvalid'));
        return;
      }
      setAnnouncement('');
      lastAnnouncedKey.current = '';
      performMove(draggedPageId, targetPage.id);
    },
    [announce, dragState, pages, performMove, t],
  );

  const handleRootDragOver = useCallback(
    (event: DragEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      if (dragState === null) return;
      event.dataTransfer.dropEffect = 'move';
      markPortalSidebarPageDropTarget(event.currentTarget);
      announce('root', t('dropInside', { name: pagesT('spaceRoot') }));
    },
    [announce, dragState, pagesT, t],
  );

  const handleRootDrop = useCallback(
    (event: DragEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      markPortalSidebarPageDropTarget(null);
      const draggedPageId = dragState?.draggedPageId;
      setDragState(null);
      if (draggedPageId === undefined) {
        announce('invalid:root', t('dropInvalid'));
        return;
      }
      setAnnouncement('');
      lastAnnouncedKey.current = '';
      performMove(draggedPageId, null);
    },
    [announce, dragState, performMove, t],
  );

  const handleDragEnd = useCallback((): void => {
    markPortalSidebarPageDropTarget(null);
    setDragState(null);
    setAnnouncement('');
    lastAnnouncedKey.current = '';
  }, []);

  const moveByKeyboard = useCallback(
    (page: PortalSidebarPage, direction: PortalSidebarPageKeyboardMove): void => {
      const parentId =
        direction === PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE.Indent
          ? resolvePortalSidebarIndentParentId(pages, page.id)
          : resolvePortalSidebarOutdentParentId(pages, page.id);
      if (parentId === undefined) return;
      performMove(page.id, parentId);
    },
    [pages, performMove],
  );

  return {
    announcement,
    draggedPageId: dragState?.draggedPageId ?? null,
    handleDragEnd,
    handleDragStart,
    handleRootDragOver,
    handleRootDrop,
    handleRowDragOver,
    handleRowDrop,
    moveByKeyboard,
  };
};
