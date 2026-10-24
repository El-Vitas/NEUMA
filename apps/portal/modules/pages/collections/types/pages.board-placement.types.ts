import type { PageFilter, PageGroupByMode, PageSort } from '@neuma/shared';
import type { PageRow, PageSchemaProperty, PageViewBand } from './pages.schema.types';

/** What decides where a card belongs: the view as the reader sees it, with its markers already resolved. */
export interface BoardPlacementContext {
  /** The filter of the view and the quick filter together; null when there is none. */
  readonly filter: null | PageFilter;
  readonly groupByKey: string;
  readonly groupByMode: PageGroupByMode;
  readonly hasSearch: boolean;
  readonly hiddenGroups: readonly string[];
  /** Milliseconds since the epoch, for the relative dates of the filter. */
  readonly now: number;
  readonly properties: readonly PageSchemaProperty[];
  readonly sorts: readonly PageSort[];
  /** Empty when the board has a single grouping dimension. */
  readonly subGroupByKey: string;
  readonly timeZone: string;
  /** Who looks; null when the browser does not know, and a filter that names the reader then goes to the server. */
  readonly viewerId: null | string;
}

export interface BoardPlacementInput {
  readonly bands: readonly PageViewBand[];
  readonly changedRows: readonly PageRow[];
  readonly context: BoardPlacementContext;
  readonly trashedIds: readonly string[];
}

/** Why the browser cannot say where a card goes and the view has to be read again (ADR 026, ADR 029). */
export type BoardRequeryReason =
  | 'search'
  | 'server-only-property'
  | 'unknown-group'
  | 'unsupported-grouping'
  | 'viewer-marker';

export interface BoardColumnAddress {
  readonly bandKey: string;
  readonly groupKey: string;
}

export interface BoardColumn {
  readonly address: BoardColumnAddress;
  readonly nextCursor: null | string;
  readonly rows: readonly PageRow[];
}

/** The board while the changed cards are being placed one after another. */
export interface BoardPlacementProgress {
  readonly bands: readonly PageViewBand[];
  readonly isCountChanged: boolean;
  readonly refreshColumns: readonly BoardColumnAddress[];
}

export type BoardPlacement =
  | { readonly kind: 'requery'; readonly reason: BoardRequeryReason }
  | {
      readonly bands: readonly PageViewBand[];
      /** True when some column gained or lost a card, so its count has to be checked with the server. */
      readonly isCountChanged: boolean;
      readonly kind: 'placed';
      /** Columns whose place for a card only the server knows (a manual order); they are read again. */
      readonly refreshColumns: readonly BoardColumnAddress[];
    };
