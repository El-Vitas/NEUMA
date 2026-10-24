import type { PageRow } from './pages.schema.types';

export interface RowsPageRead {
  readonly nextCursor: null | string;
  readonly rows: readonly PageRow[];
}

export interface CollectRowPagesInput {
  /** Null when the page cannot be read. `remaining` is how many rows are still missing, to ask for no more. */
  readonly readPage: (cursor: string | undefined, remaining: number) => Promise<null | RowsPageRead>;
  /** Where to start; the first page when absent. */
  readonly startCursor?: string;
  /** Reading stops once this many rows are in hand, so the last page may carry a few more. */
  readonly wanted: number;
}

export interface CollectedRows {
  /** Where the rows in hand end; null when the server has no more. */
  readonly nextCursor: null | string;
  readonly rows: readonly PageRow[];
}
