'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError } from '@/shared/lib/action-result';
import { isBoardDropAllowed, readBoardGroupValue, resolveBoardKeyboardTarget } from '../lib/pages.board-drag.lib';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type {
  PageBoardDragController,
  PageBoardDragState,
  PageBoardMoveDirection,
} from '../types/pages.board-drag.types';
import type { PageViewGroup } from '../types/pages.schema.types';

/**
 * Moving a card from one column to another, with the mouse or with the keyboard.
 *
 * The value the card lands with is the column it lands on, so dropping is the
 * whole act: nobody has to open the row afterwards to say where it went. It is
 * offered from the keyboard as well, because a board that only answers to a
 * pointer leaves out whoever cannot use one.
 */
export const usePagesBoardDrag = (
  groups: readonly PageViewGroup[],
  groupByKey: string,
  spaceId: string,
): PageBoardDragController => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [carried, setCarried] = useState<PageBoardDragState | null>(null);
  const [hoveredGroupKey, setHoveredGroupKey] = useState<null | string>(null);
  const [announcement, setAnnouncement] = useState('');
  const [isMoving, startMoving] = useTransition();

  const land = (rowId: string, toGroupKey: string): void => {
    const landed = groups.find((group) => group.key === toGroupKey);
    startMoving(async () => {
      const result = await updatePageRowPropertiesAction({
        pageId: rowId,
        propertyValues: { [groupByKey]: readBoardGroupValue(toGroupKey) },
        spaceId,
      });
      if (hasActionError(result)) {
        toast.error(tErrors('generic'));
        return;
      }
      /** No reload is asked for: the action invalidates what the board was drawn from, and the tree comes back on its own. */
      setAnnouncement(t('cardMoved', { column: landed?.label ?? toGroupKey }));
    });
  };

  const drop = (toGroupKey: string): void => {
    const wasCarrying = carried;
    setCarried(null);
    setHoveredGroupKey(null);
    if (wasCarrying === null || !isBoardDropAllowed(wasCarrying.fromGroupKey, toGroupKey)) return;
    land(wasCarrying.rowId, toGroupKey);
  };

  return {
    announcement,
    draggingRowId: carried?.rowId ?? null,
    hoveredGroupKey,
    isMoving,
    moveByKeyboard: (rowId: string, fromGroupKey: string, direction: PageBoardMoveDirection) => {
      const toGroupKey = resolveBoardKeyboardTarget(groups, fromGroupKey, direction);
      if (toGroupKey === null) return;
      land(rowId, toGroupKey);
    },
    onDragEnd: () => {
      setCarried(null);
      setHoveredGroupKey(null);
    },
    onDragLeave: (groupKey: string) => setHoveredGroupKey((current) => (current === groupKey ? null : current)),
    onDragOver: setHoveredGroupKey,
    onDragStart: (rowId: string, fromGroupKey: string) => setCarried({ fromGroupKey, rowId }),
    onDrop: drop,
  };
};
