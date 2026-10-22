import type { PageGroupByMode, PageQueryOutcome } from '@neuma/shared';
import type {
  PageAttachedFile,
  PagePropertyValues,
  PageRelatedRow,
  PageRow,
  PageSchemaProperty,
} from './pages.schema.types';

export type GroupedOutcome = Extract<PageQueryOutcome, { readonly kind: 'groups' }>;

/** What names the groups of an outcome: the properties they are made by and how a status group is told. */
export interface Labelling {
  readonly bandProperty: PageSchemaProperty | undefined;
  readonly mode: PageGroupByMode;
  readonly property: PageSchemaProperty | undefined;
  readonly statusGroupLabel: (group: string) => string;
}

/** What a view query answers (ADR 025): the outcome of each reducer by id, and one record per row they name. */
export interface PageQueryResult {
  readonly attachedFiles: readonly PageAttachedFile[];
  /** Where to read what changed after this answer; taken before its rows were read, so no change falls between. */
  readonly changesCursor: string;
  /** Collections the formulas and rollups read: a change there can change a value here (ADR 028). */
  readonly computedDependsOn?: readonly string[] | undefined;
  readonly reducers: Readonly<Record<string, PageQueryOutcome>>;
  readonly relatedRows: readonly PageRelatedRow[];
  readonly rows: Readonly<Record<string, PageRow>>;
  readonly spaceId: string;
  readonly viewVersion: number | null;
}

/** The rows a "load more" brings, with what their cells need to be shown. */
export interface PageRowsContinuation {
  readonly attachedFiles: readonly PageAttachedFile[];
  readonly nextCursor: string | null;
  readonly relatedRows: readonly PageRelatedRow[];
  readonly rows: readonly PageRow[];
}

/** One page of the whole collection read for the browser to filter, sort and group by itself (ADR 029). */
export interface PageEveryRowRead {
  readonly attachedFiles: readonly PageAttachedFile[];
  /** Taken before the rows were read, so no change falls between them and what is read after it. */
  readonly changesCursor: string;
  readonly nextCursor: string | null;
  readonly relatedRows: readonly PageRelatedRow[];
  readonly rows: readonly PageRow[];
}

/** Every row of the collection the view lets through, joined from its pages. */
export interface EveryRowRead {
  readonly attachedFiles: readonly PageAttachedFile[];
  readonly changesCursor: string;
  readonly relatedRows: readonly PageRelatedRow[];
  readonly rows: readonly PageRow[];
}

/** What changed in a collection since a cursor, for the rows the reader may open and nobody else's. */
export interface PageCollectionChanges {
  readonly attachedFiles: readonly PageAttachedFile[];
  /** Pass it back to read what changed after this answer. */
  readonly cursor: string;
  readonly hasMore: boolean;
  /** True when the cursor was not one the server wrote: the view has to be read again. */
  readonly isReset: boolean;
  /** Rows whose rollups read a row that changed: their own values are as they were, their computed ones may not be. */
  readonly possiblyChanged: readonly PageRow[];
  readonly possiblyChangedIsTruncated: boolean;
  readonly relatedRows: readonly PageRelatedRow[];
  readonly rows: readonly PageRow[];
  /** The rows the reader can open and are active, to notice one that was hidden. */
  readonly total: number;
  readonly trashedIds: readonly string[];
}

/** Every row the view lets through with the search applied, or the fact that they are too many to act on. */
export interface PageMatchingRows {
  readonly isTooMany: boolean;
  readonly rowIds: readonly string[];
  readonly valuesByRow: Readonly<Record<string, PagePropertyValues>>;
}

/** The view after an operation: what to draw from, and the version the next operation builds on. */
export interface PageChangedView {
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly id: string;
  readonly version: number;
}
