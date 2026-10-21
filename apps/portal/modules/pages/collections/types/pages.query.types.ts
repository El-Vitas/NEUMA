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
