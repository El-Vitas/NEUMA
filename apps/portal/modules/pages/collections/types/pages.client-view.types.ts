import type { PageFilter } from '@neuma/shared';
import type {
  PageRow,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewBand,
  PageViewOutcome,
} from './pages.schema.types';

/** What the browser needs to draw a view from the rows it holds, with no question to the server. */
export interface ClientViewInput {
  readonly properties: readonly PageSchemaProperty[];
  readonly quickFilter: null | PageFilter;
  /** The moment relative dates are told from; a function so that a screen does not read the clock while it draws. */
  readonly readNow: () => number;
  /** Every row the view lets through for its saved filter, in the manual order of the view. */
  readonly rows: readonly PageRow[];
  /** How many rows each group shows, by band and group (`bandKey|groupKey`); a group not named shows its first page. */
  readonly shown: Readonly<Record<string, number>>;
  readonly statusGroupLabel: (group: string) => string;
  /** The zone relative dates are told in. */
  readonly timeZone: string;
  readonly view: PageSchemaView;
  /** Who looks, for "me". */
  readonly viewerId: string;
}

export interface ViewClientModeInput {
  readonly properties: readonly PageSchemaProperty[];
  readonly quickFilter: null | PageFilter;
  readonly search: string;
  readonly view: PageSchemaView;
  /** Rows the reader can open and the view lets through, as the counts of the server say. */
  readonly visibleRowCount: number;
}

export interface ClientViewReading {
  readonly aggregates: PageViewAggregates | null;
  readonly bands: readonly PageViewBand[];
  readonly outcome: PageViewOutcome;
}
