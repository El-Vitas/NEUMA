import type { PageFilter } from '@neuma/shared';
import type { PageRow } from './pages.schema.types';

export interface PagesRowPagingInput {
  /** The ids of the rows the server drew in this scope, so a row loaded earlier that it now draws is not repeated. */
  readonly drawnRowIds: readonly string[];
  /** Where the rows the server drew end; null when it drew them all. */
  readonly firstCursor: string | null;
  /** One column (or cell) of a grouped view; absent for the rows of the whole view. */
  readonly group?: { readonly key: string; readonly subKey?: string } | undefined;
  readonly pageId: string;
  readonly spaceId: string;
  readonly viewId: string;
}

export interface PagesRowPaging {
  readonly hasMore: boolean;
  readonly isLoading: boolean;
  readonly loadMore: () => void;
  /** The rows loaded after the ones the server drew. */
  readonly rows: readonly PageRow[];
}

/** What the actions that read rows need to know of the scope they read. */
export interface ScopeAddress {
  readonly group?: { readonly key: string; readonly subKey?: string };
  readonly pageId: string;
  readonly quickFilter: null | PageFilter;
  readonly search: string;
  readonly spaceId: string;
  readonly viewId: string;
}

export interface PagesRowPagingState {
  /** Where the loaded rows end; null once the scope has been read to its end. */
  readonly cursor: null | string;
  /** Where the rows the server drew ended when this state last met them. */
  readonly firstCursor: null | string;
  readonly loaded: readonly PageRow[];
  /** Set when the server drew the scope again while rows were loaded: the window is read again from here. */
  readonly refreshFrom: null | string;
  /** The words and the quick filter the loaded rows were read with, as one key. */
  readonly queryKey: string;
}
