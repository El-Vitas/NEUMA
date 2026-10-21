import type { UserRole } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import type { PageViewer } from './page.block.types';
import type { PageRowSummary, PageRowsPage } from './page-schema.types';

/** Where a reader stands in what changed in a collection; see ADR 026. */
export interface ChangesCursor {
  /** The last row of a page of changes that was cut, in the order the changes are read. */
  readonly after: { readonly id: string; readonly xid: string } | null;
  /** The watermark of the first page of a walk: where the next walk starts once this one ends. */
  readonly fresh: string | null;
  /** The reader is told about every row written by a transaction with this id or a later one. */
  readonly since: string;
}

/** The rows that link a changed row through a relation a rollup follows. */
export interface LinkedRows {
  readonly ids: ReadonlySet<string>;
  readonly isTruncated: boolean;
}

export interface FollowRollupsInput {
  readonly deniedIds: readonly string[];
  readonly pageId: string;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly since: string;
  readonly viewer: PageViewer;
}

export interface ChangedRow {
  readonly id: string;
  readonly isActive: boolean;
  readonly xid: string;
}

export interface ReadChangedRowsInput {
  readonly after: ChangesCursor['after'];
  readonly collectionId: string;
  readonly deniedIds: readonly string[];
  readonly limit: number;
  readonly since: string;
}

export interface ReadPageChangesInput {
  readonly cursor: string | undefined;
  /** Rows to leave out besides the ones the reader cannot open (an access token's own). */
  readonly excludedRowIds?: readonly string[] | undefined;
  readonly limit: number;
  readonly pageId: string;
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageChanges extends Pick<PageRowsPage, 'attachedFiles' | 'relatedRows'> {
  /** Opaque. Pass it back to read what changed after this answer; it only moves once every change was read. */
  readonly cursor: string;
  readonly hasMore: boolean;
  /** True when the cursor is not one the server wrote: read the collection again. */
  readonly isReset: boolean;
  /** Rows whose rollups may have changed because a row they summarise did, though the row itself did not. */
  readonly possiblyChanged: readonly PageRowSummary[];
  /** More rows were possibly changed than the answer carries, or than could be followed: read the rollups again. */
  readonly possiblyChangedIsTruncated: boolean;
  readonly rows: readonly PageRowSummary[];
  readonly spaceId: string;
  /** Rows the reader can read and are active: compare it with the count held to notice a row that was hidden. */
  readonly total: number;
  readonly trashedIds: readonly string[];
}
