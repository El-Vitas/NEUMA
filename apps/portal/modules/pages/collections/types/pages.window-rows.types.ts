import type { PageFilter } from '@neuma/shared';
import type { PageRow, PageSchemaProperty, PageSchemaView } from './pages.schema.types';

export interface PagesWindowRowsInput {
  /** Where to read what changed after those rows were read; null when the screen cannot follow changes. */
  readonly changesCursor: null | string;
  /** The property that places each row; the rows without it are the ones the screen counts apart. */
  readonly dateProperty: null | string;
  /** The window holds only the first rows it could hold. */
  readonly isTruncated: boolean;
  /** The screen lists the first rows without a date, and not only counts them. */
  readonly listsUndated: boolean;
  readonly pageId: string;
  readonly properties: readonly PageSchemaProperty[];
  /** The rows the server drew for the window. */
  readonly rows: readonly PageRow[];
  readonly spaceId: string;
  /** How many rows have no date, all of them, as the server counted. */
  readonly undated: number;
  /** The first rows without a date, when the screen lists them; empty when it only counts them. */
  readonly undatedRows: readonly PageRow[];
  readonly view: PageSchemaView;
  readonly viewerId: null | string;
  /** A row is in the window when it passes any of these. */
  readonly windowFilters: readonly PageFilter[];
}

export interface PagesWindowRows {
  readonly rows: readonly PageRow[];
  readonly undated: number;
  readonly undatedRows: readonly PageRow[];
}
