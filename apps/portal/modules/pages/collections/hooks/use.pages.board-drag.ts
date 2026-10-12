'use client';

import { useTranslations } from 'next-intl';
import { useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError } from '@/shared/lib/action-result';
import { reorderPageAction } from '../../server/actions/pages.actions';
import { resolveBoardKeyboardTarget } from '../lib/pages.board-drag.lib';
import { applyBoardMoveToBands, findBandHoldingRow, resolveBoardGridDrop } from '../lib/pages.board-grid.lib';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type {
  PageBoardDragController,
  PageBoardDragState,
  PageBoardGridDropTarget,
  PageBoardGridMove,
  PageBoardMoveDirection,
} from '../types/pages.board-drag.types';
import type { PageViewBand } from '../types/pages.schema.types';

/**
 * Column and band values are written together: a diagonal move sent as two writes would leave the card
 * half moved if the second failed. Order among siblings is a separate write.
 */
export const usePagesBoardDrag = (
  bands: readonly PageViewBand[],
  groupByKey: string,
  spaceId: string,
  subGroupByKey = '',
): PageBoardDragController => {
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

  const landedPropertyValues = (move: PageBoardGridMove): Readonly<Record<string, null | string>> => ({
    ...(move.changesGroup ? { [groupByKey]: move.propertyValue } : {}),
    ...(move.changesBand && subGroupByKey !== '' ? { [subGroupByKey]: move.bandValue } : {}),
  });

  const write = async (rowId: string, move: PageBoardGridMove): Promise<boolean> => {
    const propertyValues = landedPropertyValues(move);
    if (Object.keys(propertyValues).length > 0) {
      const written = await updatePageRowPropertiesAction({ pageId: rowId, propertyValues, spaceId });
      if (hasActionError(written)) return false;
    }
    if (!move.changesOrder) return true;
    const reordered = await reorderPageAction({
      pageId: rowId,
      spaceId,
      ...(move.beforeRowId === null ? {} : { beforePageId: move.beforeRowId }),
    });
    return !hasActionError(reordered);
  };

  const land = (rowId: string, move: PageBoardGridMove, columnLabel: string): void => {
    startMoving(async () => {
      // Shown before the write finishes: waiting leaves the card still under a hand that already dropped it.
      showMoved({ move, rowId });
      const written = await write(rowId, move);
      if (!written) {
        toast.error(tErrors('generic'));
        return;
      }
      setAnnouncement(t('cardMoved', { column: columnLabel }));
    });
  };

  const columnsOf = (bandKey: string) => bands.find((band) => band.key === bandKey)?.groups ?? bands[0]?.groups ?? [];

  const labelOf = (target: PageBoardGridDropTarget): string =>
    columnsOf(target.bandKey).find((group) => group.key === target.groupKey)?.label ?? target.groupKey;

  const drop = (): void => {
    const wasCarrying = carried;
    const wasAiming = target;
    setCarried(null);
    setTarget(null);
    if (wasCarrying === null || wasAiming === null) return;
    const move = resolveBoardGridDrop(bands, wasCarrying.rowId, wasAiming);
    if (move === null) return;
    land(wasCarrying.rowId, move, labelOf(wasAiming));
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
      land(rowId, move, labelOf(aiming));
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
