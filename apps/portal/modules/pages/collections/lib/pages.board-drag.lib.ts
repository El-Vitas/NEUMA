import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import type { PageBoardMoveDirection } from '../types/pages.board-drag.types';
import type { PageViewGroup } from '../types/pages.schema.types';

/**
 * The value a card lands with when it is dropped on a column.
 *
 * The column of rows without a value is not a value of its own: dropping a card
 * there clears the property rather than writing the word «unassigned» into it.
 */
export const readBoardGroupValue = (groupKey: string): null | string =>
  groupKey === UNASSIGNED_GROUP_KEY ? null : groupKey;

/** Whether a card is being dropped somewhere that changes anything. */
export const isBoardDropAllowed = (fromGroupKey: null | string, toGroupKey: string): boolean =>
  fromGroupKey !== null && fromGroupKey !== toGroupKey;

/**
 * The column a card reaches from the keyboard, or nothing when there is none.
 *
 * It stops at the ends instead of wrapping around, because a card that jumps
 * from the last column to the first has gone somewhere nobody aimed at.
 */
export const resolveBoardKeyboardTarget = (
  groups: readonly PageViewGroup[],
  fromGroupKey: string,
  direction: PageBoardMoveDirection,
): null | string => {
  const at = groups.findIndex((group) => group.key === fromGroupKey);
  if (at === -1) return null;
  const target = direction === 'FORWARD' ? at + 1 : at - 1;
  return groups[target]?.key ?? null;
};
