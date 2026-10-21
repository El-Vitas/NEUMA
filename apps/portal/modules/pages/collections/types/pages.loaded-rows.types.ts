import type { PageRow } from './pages.schema.types';

export interface PagesLoadedRows {
  /** A group tells the table which rows it has loaded after the first page, replacing what it told before. */
  readonly report: (scope: string, rows: readonly PageRow[]) => void;
}
