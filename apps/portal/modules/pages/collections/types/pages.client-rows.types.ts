import type { PagesBoardPaging } from './pages.board-paging.types';
import type { PageRowStore } from './pages.row-store.types';
import type { PageViewAggregates } from './pages.schema.types';

/** The rows of a collection a browser holds and draws a view from, when it filters, sorts and groups them itself. */
export interface PagesClientRows extends PagesBoardPaging {
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** The rows are held and the view could be drawn from them; until then the server's drawing stands. */
  readonly isReady: boolean;
  /** Every row the view lets through; a write that is shown before the server answers goes in here. */
  readonly store: PageRowStore;
}

export type PagesClientRowsPhase = 'idle' | 'loading' | 'ready' | 'refused';

export interface PagesClientRowsState {
  /** Where to read what changed after the rows held; null before any were read. */
  readonly cursor: null | string;
  readonly phase: PagesClientRowsPhase;
  /** The rows held are the ones of this scope: the view and the saved filter it was read with. */
  readonly scope: string;
}
