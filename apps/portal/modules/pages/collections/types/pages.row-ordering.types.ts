import type { PageBoardAnchor } from './pages.board-move.types';

export type PageRowDropSide = 'AFTER' | 'BEFORE';

export type PageRowStepDirection = 'DOWN' | 'UP';

/** Rows of a table (or of one of its groups) that can be put in another place by hand, for the view that follows it. */
export interface PagesRowOrdering {
  /** The row being dragged, and the group it is in: it can only land among the rows of that group. */
  readonly carried: null | { readonly rowId: string; readonly scope: string };
  readonly drop: (targetRowId: string, scope: string, side: PageRowDropSide) => void;
  readonly forget: () => void;
  readonly isBusy: boolean;
  readonly move: (rowId: string, anchor: PageBoardAnchor) => void;
  readonly take: (rowId: string, scope: string) => void;
}
