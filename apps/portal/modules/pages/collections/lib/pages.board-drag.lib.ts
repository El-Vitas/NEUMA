import { UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import type {
  PageBoardDropSide,
  PageBoardDropTarget,
  PageBoardMove,
  PageBoardMoveDirection,
} from '../types/pages.board-drag.types';
import type { PageRow, PageViewGroup } from '../types/pages.schema.types';

/** The unassigned column is not a value: dropping there clears the property instead of writing its key. */
export const readBoardGroupValue = (groupKey: string): null | string =>
  groupKey === UNASSIGNED_GROUP_KEY ? null : groupKey;

export const isBoardDropAllowed = (fromGroupKey: null | string, toGroupKey: string): boolean =>
  fromGroupKey !== null && fromGroupKey !== toGroupKey;

/** The exact midpoint counts as AFTER so the marker does not flicker while the pointer shakes on it. */
export const readDropSideFromPointer = (
  pointerY: number,
  card: { readonly height: number; readonly top: number },
): PageBoardDropSide => (pointerY < card.top + card.height / 2 ? 'BEFORE' : 'AFTER');

export const buildNewRowPropertyValues = (groupByKey: string, groupKey: string): Readonly<Record<string, string>> => {
  const value = readBoardGroupValue(groupKey);
  return value === null ? {} : { [groupByKey]: value };
};

const findGroupOf = (groups: readonly PageViewGroup[], rowId: string): PageViewGroup | undefined =>
  groups.find((group) => group.rows.some((row) => row.id === rowId));

/** Null when the card would end up where it already is (on itself or in its own gap): nothing to write. */
export const resolveBoardDrop = (
  groups: readonly PageViewGroup[],
  rowId: string,
  target: PageBoardDropTarget,
): null | PageBoardMove => {
  if (target.beforeRowId === rowId) return null;
  const from = findGroupOf(groups, rowId);
  if (from === undefined) return null;

  const changesGroup = from.key !== target.groupKey;
  if (!changesGroup && isTheGapItAlreadyOccupied(from, rowId, target.beforeRowId)) return null;

  return {
    beforeRowId: target.beforeRowId,
    changesGroup,
    changesOrder: true,
    propertyValue: changesGroup ? readBoardGroupValue(target.groupKey) : null,
  };
};

/** A null value removes the key: a key holding nothing is not the same as an unanswered property. */
export const withLandedValue = (row: PageRow, groupByKey: string, value: null | string): PageRow['propertyValues'] => {
  const current = { ...row.propertyValues };
  if (value === null) {
    delete current[groupByKey];
    return current;
  }
  return { ...current, [groupByKey]: value };
};

const insertAt = (rows: readonly PageRow[], row: PageRow, beforeRowId: null | string): readonly PageRow[] => {
  const at = beforeRowId === null ? -1 : rows.findIndex((candidate) => candidate.id === beforeRowId);
  if (at === -1) return [...rows, row];
  return [...rows.slice(0, at), row, ...rows.slice(at)];
};

/** Optimistic result, shown before the server answers; the server response replaces it. */
export const applyBoardMoveToGroups = (
  groups: readonly PageViewGroup[],
  rowId: string,
  move: PageBoardMove,
  groupByKey: string,
): readonly PageViewGroup[] => {
  const from = findGroupOf(groups, rowId);
  const carried = from?.rows.find((row) => row.id === rowId);
  if (from === undefined || carried === undefined) return groups;

  const landing = move.changesGroup ? (move.propertyValue ?? UNASSIGNED_GROUP_KEY) : from.key;
  const arriving: PageRow = move.changesGroup
    ? { ...carried, propertyValues: withLandedValue(carried, groupByKey, move.propertyValue) }
    : carried;

  return groups.map((group) => {
    const without = group.rows.filter((row) => row.id !== rowId);
    if (group.key !== landing) return { ...group, rows: without };
    return { ...group, rows: insertAt(without, arriving, move.beforeRowId) };
  });
};

const isTheGapItAlreadyOccupied = (group: PageViewGroup, rowId: string, beforeRowId: null | string): boolean => {
  const at = group.rows.findIndex((row) => row.id === rowId);
  const following = group.rows[at + 1]?.id ?? null;
  return following === beforeRowId;
};

/** Stops at the ends instead of wrapping: a card jumping from the last column to the first was not aimed there. */
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
