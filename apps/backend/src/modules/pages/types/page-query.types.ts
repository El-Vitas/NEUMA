import type { PageQueryOutcome, PageQueryRequest, PageViewConfiguration, Result, UserRole } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import type { GroupingPlan } from '../domain/page-query.grouping.domain.types';
import type { QueryScope } from './page-query.sql.types';
import type { PageRowSummary, PageRowsPage } from './page-schema.types';

/** What the reducers of one request share: the configuration they read, the properties and the scope of rows. */
export interface QueryContext {
  readonly configuration: PageViewConfiguration;
  readonly properties: ReadonlyMap<string, SchemaPropertyDefinition>;
  readonly scope: QueryScope;
}

/** The groups one axis of a board shows, and whether there were more than the answer carries. */
export interface Axis {
  readonly entries: readonly { readonly isHidden: boolean; readonly key: string | null }[];
  readonly hasMore: boolean;
  readonly plan: GroupingPlan;
}

export type ReducerRun = Result<PageQueryOutcome, DomainError>;

export interface RunPageQueryInput {
  /** Rows to leave out of every count and result besides the ones the reader cannot open (an access token's own). */
  readonly excludedRowIds?: readonly string[] | undefined;
  readonly pageId: string;
  readonly request: PageQueryRequest;
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** What a query answers: the outcome of each reducer by id, and one record for every row they name. */
export interface PageQueryResult extends Pick<PageRowsPage, 'attachedFiles' | 'relatedRows'> {
  readonly reducers: Readonly<Record<string, PageQueryOutcome>>;
  readonly rows: Readonly<Record<string, PageRowSummary>>;
  readonly spaceId: string;
  readonly viewVersion: number | null;
}
