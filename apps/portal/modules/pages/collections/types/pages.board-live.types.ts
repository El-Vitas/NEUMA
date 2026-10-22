import type { BoardColumnAddress, BoardPlacementContext, BoardRequeryReason } from './pages.board-placement.types';
import type { ChangesController, ChangesReadFailure } from './pages.collection-changes.types';
import type { PageCollectionChanges } from './pages.query.types';
import type { PageRow, PageViewBand } from './pages.schema.types';

/** Why the view went to the server instead of placing the rows itself; logged so each cost can be measured. */
export type BoardRefreshReason = ChangesReadFailure | 'column-failed' | BoardRequeryReason;

export interface BoardColumnRead {
  readonly nextCursor: null | string;
  readonly rows: readonly PageRow[];
}

export interface BoardLiveOptions {
  /** Called once the bands changed, with the columns whose count has to be checked with the server. */
  readonly applyBands: (bands: readonly PageViewBand[]) => void;
  readonly coalesceMs: number;
  readonly initialCursor: string;
  readonly onCountChanged: () => void;
  readonly onLookups: (changes: PageCollectionChanges) => void;
  readonly readBands: () => readonly PageViewBand[];
  readonly readChanges: (cursor: string) => Promise<PageCollectionChanges | null>;
  readonly readColumn: (address: BoardColumnAddress, wanted: number) => Promise<BoardColumnRead | null>;
  readonly readContext: () => BoardPlacementContext;
  /** The view is drawn again from the server; `reason` says which case of the table asked for it. */
  readonly requestRefresh: (reason: BoardRefreshReason) => void;
}

export type BoardLiveController = ChangesController;
