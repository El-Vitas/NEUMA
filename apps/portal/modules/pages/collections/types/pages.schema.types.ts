import type {
  PageDateScale,
  PageDayRange,
  PageLifecycle,
  PageOptionColor,
  PagePropertyConfig,
  PagePropertyOption,
  PagePropertyType,
  PagePropertyValues,
  PageViewType,
} from '@neuma/shared';
import type { ReactNode } from 'react';

export type { PagePropertyValue, PagePropertyValues } from '@neuma/shared';

export interface PageSchemaProperty {
  readonly config: PagePropertyConfig;
  readonly key: string;
  readonly label: string;
  readonly type: PagePropertyType;
  readonly required: boolean;
  readonly options: readonly PagePropertyOption[] | null;
  /** Only while a relation is being added: the other collection also gets the property that points back. */
  readonly twoWay?: boolean;
}

export interface PagePersonOption {
  readonly email: string;
  readonly id: string;
  readonly name: string;
}

/** A view as the shape editor holds it: one that is new has no id yet, and the server gives it one. */
export interface PageSchemaViewDraft {
  readonly configuration: Readonly<Record<string, unknown>>;
  /** Sent back so a renamed or moved tab stays the same view and keeps its manual order. */
  readonly id?: string | undefined;
  readonly isDefault: boolean;
  readonly name: string;
  readonly type: PageViewType;
  readonly version?: number | undefined;
}

export interface PageSchemaView extends PageSchemaViewDraft {
  /** What queries and operations name the view by; the name can change, the id cannot. */
  readonly id: string;
  /** Rises with every operation on the view. */
  readonly version: number;
}

export interface PageSchema {
  readonly pageId: string;
  readonly spaceId: string;
  readonly properties: readonly PageSchemaProperty[];
  readonly views: readonly PageSchemaView[];
}

export interface PageRow {
  readonly id: string;
  readonly parentId: string | null;
  readonly spaceId: string;
  readonly title: string;
  readonly propertyValues: PagePropertyValues | null;
  readonly order: number;
  readonly lifecycle: PageLifecycle;
}

export interface PageViewGroup {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  /** Where the next rows of this group start; null (or absent) when the group has been read to its end. */
  readonly nextCursor?: string | null;
  readonly rows: readonly PageRow[];
}

/** Rows arrive already rendered by the server; the group only decides whether to show them. */
export interface PageTableGroup {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  readonly rowCount: number;
  readonly rows: ReactNode;
}

export interface PageViewBand {
  readonly color: PageOptionColor | null;
  readonly groups: readonly PageViewGroup[];
  readonly key: string;
  readonly label: string;
}

/** What a calendar was drawn from: the month it opens on, and what the rows of its grid leave out. */
export interface PageCalendarReading {
  /** The day the week is drawn around; the first of the month for a month. */
  readonly day: string;
  /** The grid holds more rows than a calendar reads, so it shows the first ones. */
  readonly isTruncated: boolean;
  readonly month: string;
  readonly scale: Extract<PageDateScale, 'MONTH' | 'WEEK'>;
  /** Rows with no date, which fall on no day. */
  readonly undated: number;
}

/** What a timeline was drawn from: the days of its window, today, and the rows that have no place in it. */
export interface PageTimelineReading {
  /** The day the window was drawn around, which a step forward or back starts from. */
  readonly anchor: string;
  /** The window holds more rows than a timeline reads, so it shows the first ones. */
  readonly isTruncated: boolean;
  readonly scale: PageDateScale;
  /** Today in the calendar of the server, where the marker goes. */
  readonly today: string;
  /** All the rows with no start. */
  readonly undated: number;
  /** The first of them, to list them apart. */
  readonly undatedRows: readonly PageRow[];
  readonly window: PageDayRange;
}

export type PageViewOutcome =
  | { readonly bands: readonly PageViewBand[]; readonly kind: 'BANDED_ROWS' }
  | {
      readonly calendar?: PageCalendarReading;
      readonly kind: 'FLAT_ROWS';
      readonly nextCursor?: string | null;
      readonly rows: readonly PageRow[];
      readonly timeline?: PageTimelineReading;
    }
  | { readonly groups: readonly PageViewGroup[]; readonly kind: 'GROUPED_ROWS' }
  | { readonly kind: 'MISSING_GROUPING_PROPERTY' };

export interface PageAttachedFile {
  readonly id: string;
  readonly mimeType: string;
  readonly name: string;
  readonly size: number;
}

export interface PageRelatedRow {
  readonly id: string;
  readonly title: string;
}

export interface PageViewReading {
  /** The files the cells of the rows hold, so a cell can show their names. */
  readonly attachedFiles: readonly PageAttachedFile[];
  /**
   * The counts and calculations, which the database finishes after the rows are drawn (ADR 025). A client reads it
   * with `use` under a Suspense; null when it could not be computed.
   */
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** The rows the relation cells point to that the reader may open. */
  readonly relatedRows: readonly PageRelatedRow[];
  readonly outcome: PageViewOutcome;
}

/** Counts and calculations over every row the view lets through, not only the ones drawn so far. */
export interface PageViewAggregates {
  /** Rows counted once, even when a grouping by several values repeats them. */
  readonly distinctRowCount: number;
  /** Rows in each group, by the group key and, in a board with bands, the band key (`key|subKey`). */
  readonly groupCounts: Readonly<Record<string, number>>;
  /** What the calculations of the columns say for each group, by group key and then property key. */
  readonly groupCalculations: Readonly<Record<string, Readonly<Record<string, number | null>>>>;
  /** What the calculations of the columns say for the whole view, by property key. */
  readonly calculations: Readonly<Record<string, number | null>>;
}

export type PageViewFlatOutcome = Extract<PageViewOutcome, { readonly kind: 'FLAT_ROWS' }>;
export type PageViewGroupedOutcome = Extract<PageViewOutcome, { readonly kind: 'GROUPED_ROWS' }>;
export type PageViewBandedOutcome = Extract<PageViewOutcome, { readonly kind: 'BANDED_ROWS' }>;
