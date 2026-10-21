import type { PageRow, PageViewBand } from './pages.schema.types';

export interface PagesBoardPaging {
  /** The bands as the server drew them, with the cards each column loaded since added after them. */
  readonly bands: readonly PageViewBand[];
  readonly isLoading: (bandKey: string, groupKey: string) => boolean;
  readonly loadMore: (bandKey: string, groupKey: string) => void;
}

export interface PagesBoardPagingInput {
  readonly bands: readonly PageViewBand[];
  readonly pageId: string;
  readonly spaceId: string;
  readonly viewId: string;
}

/** The cards a column loaded after its first page, and where the server's own cards ended when it did. */
export interface PagesBoardLoaded {
  /** Where the loaded cards end; null once the column has been read to its end. */
  readonly cursor: null | string;
  /** Where the cards the server drew ended when these were read. */
  readonly drawnCursor: null | string;
  /** Set while the window is being read again from the new end of the server's cards. */
  readonly refreshFrom: null | string;
  readonly rows: readonly PageRow[];
}

/** A column the server drew again with a different end, while it held loaded cards. */
export interface ColumnToRefresh {
  readonly bandKey: string;
  /** The end of the cards the server draws now, which is where the window is read from. */
  readonly drawnCursor: string;
  readonly groupKey: string;
}
