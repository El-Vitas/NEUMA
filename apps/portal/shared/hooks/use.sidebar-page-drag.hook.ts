'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { DragEvent } from 'react';
import { useCallback, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { movePageAction, reorderPageAction } from '@/modules/pages/server/actions/pages.actions';
import {
  PORTAL_SIDEBAR_PAGE_DRAG_TYPE,
  PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE,
} from '@/modules/portal/constants/portal.sidebar.drag.constants';
import {
  isPortalSidebarPageDropAllowed,
  markPortalSidebarPageDropTarget,
  readPortalSidebarDropIntent,
  resolvePortalSidebarIndentParentId,
  resolvePortalSidebarOutdentParentId,
} from '@/modules/portal/lib/portal.sidebar.drag.lib';
import type {
  PortalSidebarPageDragController,
  PortalSidebarPageDragState,
  PortalSidebarPageKeyboardMove,
} from '@/modules/portal/types/portal.sidebar.drag.types';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';
import { hasActionError, isLockedActionFailure } from '@/shared/lib/action-result';

/** Where the pointer lands in a row tells nesting from placing: the middle nests, the edges sit beside. */
export const useSidebarPageDrag = (
  pages: readonly PortalSidebarPage[],
  spaceId: string,
): PortalSidebarPageDragController => {
  const t = useTranslations('pages.treePanel');
  const pagesT = useTranslations('pages');
  const tErrors = useTranslations('errors');
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
          toast.error(isLockedActionFailure(result) ? tErrors('reasons.locked') : pagesT('moveError'));
          return;
        }
        toast.success(pagesT('moved'));
        router.refresh();
      });
    },
    [isMoving, pagesT, router, spaceId, tErrors],
  );

  /** Dropping beside a row with a different parent sets the parent first, then the position among its children. */
  const performReorder = useCallback(
    (pageId: string, targetPage: PortalSidebarPage, intent: 'after' | 'before'): void => {
      if (isMoving) return;
      const dragged = pages.find((page) => page.id === pageId);
      if (dragged === undefined) return;
      const sisters = pages
        .filter((page) => page.parentId === targetPage.parentId && page.id !== pageId)
        .sort((one, other) => one.order - other.order);
      const landedAt = sisters.findIndex((page) => page.id === targetPage.id);
      const beforePageId = intent === 'before' ? targetPage.id : (sisters[landedAt + 1]?.id ?? undefined);

      startTransition(async () => {
        if (dragged.parentId !== targetPage.parentId) {
          const moved = await movePageAction({ pageId, parentId: targetPage.parentId, spaceId });
          if (hasActionError(moved)) {
            toast.error(isLockedActionFailure(moved) ? tErrors('reasons.locked') : pagesT('moveError'));
            return;
          }
        }
        const result = await reorderPageAction({ beforePageId, pageId, spaceId });
        if (hasActionError(result)) {
          toast.error(pagesT('moveError'));
          return;
        }
        toast.success(pagesT('moved'));
        router.refresh();
      });
    },
    [isMoving, pages, pagesT, router, spaceId, tErrors],
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
      const intent = readPortalSidebarDropIntent(event.currentTarget.getBoundingClientRect(), event.clientY);
      markPortalSidebarPageDropTarget(event.currentTarget, intent);
      if (intent === 'nest') {
        announce(`inside:${targetPage.id}`, t('dropInside', { name: targetPage.title }));
        return;
      }
      announce(
        `${intent}:${targetPage.id}`,
        t(intent === 'before' ? 'dropBefore' : 'dropAfter', { name: targetPage.title }),
      );
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
      const intent = readPortalSidebarDropIntent(event.currentTarget.getBoundingClientRect(), event.clientY);
      if (intent === 'nest') {
        performMove(draggedPageId, targetPage.id);
        return;
      }
      performReorder(draggedPageId, targetPage, intent);
    },
    [announce, dragState, pages, performMove, performReorder, t],
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
