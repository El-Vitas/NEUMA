import type { PageBoardAnchor } from '../types/pages.board-move.types';
import type { PageRowDropSide, PageRowStepDirection } from '../types/pages.row-ordering.types';

/** The id of the row next to this one on that side, among the rows drawn for the same group; null at the ends. */
export const findNeighbourRowId = (row: HTMLElement, direction: PageRowStepDirection, scope: string): null | string => {
  let neighbour = direction === 'UP' ? row.previousElementSibling : row.nextElementSibling;
  while (neighbour !== null) {
    if (
      neighbour instanceof HTMLElement &&
      neighbour.dataset.scope === scope &&
      neighbour.dataset.rowId !== undefined
    ) {
      return neighbour.dataset.rowId;
    }
    neighbour = direction === 'UP' ? neighbour.previousElementSibling : neighbour.nextElementSibling;
  }
  return null;
};

/** Which half of a row the pointer is over; the middle line counts as the lower half. */
export const readRowDropSide = (pointerY: number, box: { height: number; top: number }): PageRowDropSide =>
  pointerY < box.top + box.height / 2 ? 'BEFORE' : 'AFTER';

/** The row lands beside the one it was dropped on, told as that neighbour so two moves do not undo each other. */
export const resolveRowDropAnchor = (targetRowId: string, side: PageRowDropSide): PageBoardAnchor =>
  side === 'BEFORE' ? { before: targetRowId } : { after: targetRowId };

/** One place up or down is a drop on the neighbour on that side; at the end of the rows there is nothing to do. */
export const resolveRowStepAnchor = (
  direction: PageRowStepDirection,
  previousRowId: null | string,
  nextRowId: null | string,
): null | PageBoardAnchor => {
  if (direction === 'UP') return previousRowId === null ? null : resolveRowDropAnchor(previousRowId, 'BEFORE');
  return nextRowId === null ? null : resolveRowDropAnchor(nextRowId, 'AFTER');
};
