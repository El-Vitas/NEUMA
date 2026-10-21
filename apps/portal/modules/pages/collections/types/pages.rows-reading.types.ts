import type { PageFilter } from '@neuma/shared';
import type { PageCalendarRange } from './pages.calendar.types';
import type { PageAttachedFile, PageRelatedRow, PageRow } from './pages.schema.types';

export interface ReadRowsInput {
  /** One column (or cell) of a grouped view; absent for the rows of the whole view. */
  readonly group?: { readonly key: string; readonly subKey?: string | undefined } | undefined;
  readonly pageId: string;
  readonly quickFilter?: null | PageFilter | undefined;
  readonly search: string;
  readonly spaceId: string;
  readonly startCursor?: string | undefined;
  readonly viewId: string;
  readonly wanted: number;
}

export interface ScopeRowsRead {
  readonly attachedFiles: readonly PageAttachedFile[];
  /** Where the rows read end; null when the scope has no more. */
  readonly nextCursor: null | string;
  readonly relatedRows: readonly PageRelatedRow[];
  readonly rows: readonly PageRow[];
}

export interface CalendarWindowInput {
  readonly dateProperty: string;
  readonly maximumRows: number;
  readonly pageId: string;
  readonly quickFilter: null | PageFilter;
  readonly range: PageCalendarRange;
  readonly search: string;
  readonly spaceId: string;
  readonly viewId: string;
}

export interface CalendarWindowRead {
  readonly attachedFiles: readonly PageAttachedFile[];
  readonly isTruncated: boolean;
  readonly relatedRows: readonly PageRelatedRow[];
  readonly rows: readonly PageRow[];
  readonly undated: number;
}
