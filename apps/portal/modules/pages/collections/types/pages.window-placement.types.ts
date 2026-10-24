import type { PageFilter } from '@neuma/shared';
import type { PageRow, PageSchemaProperty } from './pages.schema.types';

/** What decides whether a row belongs on a screen of days: the view as the reader sees it, with the days it shows. */
export interface WindowPlacementContext {
  /** The filter of the view and the quick filter together; null when there is none. */
  readonly filter: null | PageFilter;
  readonly hasSearch: boolean;
  /** The window holds only the first rows it could hold. */
  readonly isTruncated: boolean;
  readonly now: number;
  readonly properties: readonly PageSchemaProperty[];
  readonly timeZone: string;
  /** Rows without a date, when the screen lists them apart; null when it only counts them. */
  readonly undatedFilter: null | PageFilter;
  /** How many rows have no date, all of them; more than the list holds when the list is the first ones. */
  readonly undatedTotal: number;
  /** Who looks; null when the browser does not know. */
  readonly viewerId: null | string;
  /** A row is in the window when it passes any of these. */
  readonly windowFilters: readonly PageFilter[];
}

export interface WindowPlacementInput {
  readonly changedRows: readonly PageRow[];
  readonly context: WindowPlacementContext;
  /** The rows the window holds. */
  readonly rows: readonly PageRow[];
  readonly trashedIds: readonly string[];
  /** The rows without a date the screen lists. */
  readonly undatedRows: readonly PageRow[];
}

/** Why the browser cannot say what a screen of days holds and the server has to be asked (ADR 026, ADR 029). */
export type WindowRequeryReason =
  | 'search'
  | 'server-only-property'
  | 'undated-truncated'
  | 'viewer-marker'
  | 'window-truncated';

export type WindowPlacement =
  | { readonly kind: 'requery'; readonly reason: WindowRequeryReason }
  | {
      /** True when a row came in, went out or changed, so the counts of the screen are worth reading again. */
      readonly hasChanged: boolean;
      readonly kind: 'placed';
      readonly rows: readonly PageRow[];
      readonly undatedRows: readonly PageRow[];
    };
