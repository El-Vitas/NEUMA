'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { DragEvent } from 'react';
import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { movePageAction } from '@/modules/pages/server/actions/pages.actions';
import {
  PORTAL_SIDEBAR_PAGE_DRAG_TYPE,
  PORTAL_SIDEBAR_SPACE_DRAG_TYPE,
} from '@/modules/portal/constants/portal.sidebar.drag.constants';
import {
  markPortalSidebarPageDropTarget,
  readPortalSidebarDraggedPage,
  readPortalSidebarDraggedSpaceId,
} from '@/modules/portal/lib/portal.sidebar.drag.lib';
import type { PortalSidebarSpaceDropController } from '@/modules/portal/types/portal.sidebar.drag.types';
import { reorderSpaceAction } from '@/modules/spaces/server/actions/spaces.actions';
import { hasActionError } from '@/shared/lib/action-result';

/**
 * What a space row can receive: a page, which moves there, and another space,
 * which takes its place in the list.
 *
 * The row belongs to no tree, so it learns what is being dragged from the drag
 * itself rather than from shared state. The two are told apart by what the drag
 * declares it carries, which is the one thing a browser lets one read before the
 * drop. Anything dropped where it already is changes nothing.
 */
export const useSidebarSpaceDrop = (): PortalSidebarSpaceDropController => {
  const t = useTranslations('pages');
  const spacesT = useTranslations('spaces');
  const router = useRouter();
  const [draggedSpaceId, setDraggedSpaceId] = useState<null | string>(null);
  const [isMovingIntoSpace, startTransition] = useTransition();

  const handleSpaceDragStart = useCallback((event: DragEvent<HTMLElement>, spaceId: string): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(PORTAL_SIDEBAR_SPACE_DRAG_TYPE, JSON.stringify({ spaceId }));
    setDraggedSpaceId(spaceId);
  }, []);

  const handleSpaceDragEnd = useCallback((): void => {
    markPortalSidebarPageDropTarget(null);
    setDraggedSpaceId(null);
  }, []);

  const handleSpaceDragOver = useCallback((event: DragEvent<HTMLElement>): void => {
    const carries =
      event.dataTransfer.types.includes(PORTAL_SIDEBAR_PAGE_DRAG_TYPE) ||
      event.dataTransfer.types.includes(PORTAL_SIDEBAR_SPACE_DRAG_TYPE);
    if (!carries) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    markPortalSidebarPageDropTarget(event.currentTarget);
  }, []);

  const movePageIntoSpace = useCallback(
    (pageId: string, fromSpaceId: string, targetSpaceId: string): void => {
      startTransition(async () => {
        const result = await movePageAction({ pageId, parentId: null, spaceId: fromSpaceId, targetSpaceId });
        if (hasActionError(result)) {
          toast.error(t('moveError'));
          return;
        }
        toast.success(t('moved'));
        router.refresh();
      });
    },
    [router, t],
  );

  const putSpaceBefore = useCallback(
    (spaceId: string, beforeSpaceId: string): void => {
      startTransition(async () => {
        const result = await reorderSpaceAction({ beforeSpaceId, spaceId });
        if (hasActionError(result)) {
          toast.error(spacesT('reorderError'));
          return;
        }
        router.refresh();
      });
    },
    [router, spacesT],
  );

  const handleSpaceDrop = useCallback(
    (event: DragEvent<HTMLElement>, targetSpaceId: string): void => {
      markPortalSidebarPageDropTarget(null);
      setDraggedSpaceId(null);
      const draggedPage = readPortalSidebarDraggedPage(event.dataTransfer.getData(PORTAL_SIDEBAR_PAGE_DRAG_TYPE));
      if (draggedPage !== null) {
        event.preventDefault();
        if (draggedPage.spaceId === targetSpaceId) return;
        movePageIntoSpace(draggedPage.pageId, draggedPage.spaceId, targetSpaceId);
        return;
      }
      const droppedSpaceId = readPortalSidebarDraggedSpaceId(
        event.dataTransfer.getData(PORTAL_SIDEBAR_SPACE_DRAG_TYPE),
      );
      if (droppedSpaceId === null) return;
      event.preventDefault();
      if (droppedSpaceId === targetSpaceId) return;
      putSpaceBefore(droppedSpaceId, targetSpaceId);
    },
    [movePageIntoSpace, putSpaceBefore],
  );

  return {
    draggedSpaceId,
    handleSpaceDragEnd,
    handleSpaceDragOver,
    handleSpaceDragStart,
    handleSpaceDrop,
    isMovingIntoSpace,
  };
};
