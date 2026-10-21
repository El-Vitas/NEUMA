'use client';

import { useTranslations } from 'next-intl';
import { useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError } from '@/shared/lib/action-result';
import { resolveBoardKeyboardTarget } from '../lib/pages.board-drag.lib';
import { applyBoardMoveToBands, findBandHoldingRow, resolveBoardGridDrop } from '../lib/pages.board-grid.lib';
import { buildBoardMoveValues, resolveBoardAnchor } from '../lib/pages.board-move.lib';
import { movePageRowAction } from '../server/actions/pages.collections.actions';
import type {
  PageBoardDragController,
  PageBoardDragInput,
  PageBoardDragState,
  PageBoardGridDropTarget,
  PageBoardGridMove,
  PageBoardMoveDirection,
} from '../types/pages.board-drag.types';
import type { PageViewBand } from '../types/pages.schema.types';

/**
 * The value of the column and the place among the other cards are one write: a diagonal move sent as two writes would
 * leave the card half moved if the second failed. In a view sorted by something, the place is the sort's, so only
 * the value is written.
 */
export const usePagesBoardDrag = ({
  bands,
  groupByKey,
  groupByMode,
  isManualOrder,
  pageId,
  properties,
  spaceId,
  subGroupByKey = '',
  viewId,
}: PageBoardDragInput): PageBoardDragController => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [carried, setCarried] = useState<PageBoardDragState | null>(null);
  const [target, setTarget] = useState<PageBoardGridDropTarget | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [isMoving, startMoving] = useTransition();
  const [shownBands, showMoved] = useOptimistic(
    bands,
    (current: readonly PageViewBand[], moved: { readonly move: PageBoardGridMove; readonly rowId: string }) =>
      applyBoardMoveToBands(current, moved.rowId, moved.move, groupByKey, subGroupByKey),
  );

  const write = async (
    pickedUp: PageBoardDragState,
    move: PageBoardGridMove,
    aim: PageBoardGridDropTarget,
  ): Promise<boolean> => {
    const { listChanges, values } = buildBoardMoveValues({
      fromBandKey: pickedUp.fromBandKey,
      fromGroupKey: pickedUp.fromGroupKey,
      groupByKey,
      mode: groupByMode,
      move,
      properties,
      subGroupByKey,
    });
    const anchor = move.changesOrder && isManualOrder ? resolveBoardAnchor(bands, pickedUp.rowId, aim) : {};
    const hasWrite = Object.keys(values).length + Object.keys(listChanges).length + Object.keys(anchor).length > 0;
    if (!hasWrite) return true;
    const moved = await movePageRowAction({
      ...anchor,
      listChanges,
      pageId,
      rowId: pickedUp.rowId,
      spaceId,
      values,
      viewId,
    });
    return !hasActionError(moved);
  };

  const land = (
    pickedUp: PageBoardDragState,
    move: PageBoardGridMove,
    aim: PageBoardGridDropTarget,
    columnLabel: string,
  ): void => {
    startMoving(async () => {
      // Shown before the write finishes: waiting leaves the card still under a hand that already dropped it.
      showMoved({ move, rowId: pickedUp.rowId });
      const written = await write(pickedUp, move, aim);
      if (!written) {
        toast.error(tErrors('generic'));
        return;
      }
      setAnnouncement(t('cardMoved', { column: columnLabel }));
    });
  };

  const columnsOf = (bandKey: string) => bands.find((band) => band.key === bandKey)?.groups ?? bands[0]?.groups ?? [];

  const labelOf = (aim: PageBoardGridDropTarget): string =>
    columnsOf(aim.bandKey).find((group) => group.key === aim.groupKey)?.label ?? aim.groupKey;

  const drop = (): void => {
    const wasCarrying = carried;
    const wasAiming = target;
    setCarried(null);
    setTarget(null);
    if (wasCarrying === null || wasAiming === null) return;
    const move = resolveBoardGridDrop(bands, wasCarrying.rowId, wasAiming);
    if (move === null) return;
    land(wasCarrying, move, wasAiming, labelOf(wasAiming));
  };

  return {
    announcement,
    bands: shownBands,
    draggingRowId: carried?.rowId ?? null,
    isMoving,
    moveByKeyboard: (rowId: string, fromGroupKey: string, direction: PageBoardMoveDirection) => {
      const bandKey = carried?.fromBandKey ?? findBandHoldingRow(bands, rowId)?.key ?? '';
      const toGroupKey = resolveBoardKeyboardTarget(columnsOf(bandKey), fromGroupKey, direction);
      if (toGroupKey === null) return;
      const aiming = { bandKey, beforeRowId: null, groupKey: toGroupKey };
      const move = resolveBoardGridDrop(bands, rowId, aiming);
      if (move === null) return;
      land({ fromBandKey: bandKey, fromGroupKey, rowId }, move, aiming, labelOf(aiming));
    },
    onDragEnd: () => {
      setCarried(null);
      setTarget(null);
    },
    onDragLeave: (groupKey: string) =>
      setTarget((current) => (current !== null && current.groupKey === groupKey ? null : current)),
    onDragOver: (aiming: PageBoardGridDropTarget) => setTarget(aiming),
    onDragStart: (rowId: string, fromGroupKey: string, fromBandKey: string) =>
      setCarried({ fromBandKey, fromGroupKey, rowId }),
    onDrop: drop,
    target,
  };
};
