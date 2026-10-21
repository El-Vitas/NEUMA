import type {
  PageFormulaCellError,
  PageFormulaContext,
  PageFormulaOutcome,
  PageFormulaPropertyInfo,
  PageFormulaTraceStep,
  PageFormulaType,
  PagePropertyValue,
  Result,
  UserRole,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import type { ComputedRowInput } from '../domain/page-computed.domain.types';
import type { PageQueryTooManyRestrictedRowsError } from '../domain/page-query.error';
import type { ComputedDraft } from '../domain/page-schema.domain.types';
import type { PageViewer } from './page.block.types';
import type { QueryScope } from './page-query.sql.types';

export interface TargetAccess {
  readonly canOpen: boolean;
  readonly closedIds: ReadonlySet<string>;
}

export type AccessResult = Result<TargetAccess, PageQueryTooManyRestrictedRowsError>;

/** What one request learned about the collections its computations reached, so no collection is read twice. */
export interface PageComputedSession {
  readonly access: Map<string, Promise<AccessResult>>;
  readonly schemas: Map<string, Promise<readonly SchemaPropertyDefinition[]>>;
}

export interface ComputeCellsInput {
  readonly collectionId: string;
  readonly context: PageFormulaContext;
  /** The computed properties to compute; all of them when absent. */
  readonly keys?: ReadonlySet<string> | undefined;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly rows: readonly ComputedRowInput[];
  readonly viewer: PageViewer;
}

export interface MaterializeInput {
  readonly context: PageFormulaContext;
  readonly keys: readonly string[];
  /** The properties as stored: a formula or rollup keeps its definition. */
  readonly properties: readonly SchemaPropertyDefinition[];
  /** The rows to compute: the ones the filter, without its conditions on computed properties, lets through. */
  readonly scope: QueryScope;
  readonly session?: PageComputedSession | undefined;
  readonly viewer: PageViewer;
}

/** What evaluating the candidate rows gave: the values for the SQL, and how many cells of each column failed. */
export interface MaterializedValues {
  readonly errorCounts: ReadonlyMap<string, number>;
  readonly values: ReadonlyMap<string, string>;
}

export interface AttachInput {
  readonly collectionId: string;
  readonly context: PageFormulaContext;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly session?: PageComputedSession | undefined;
  readonly viewer: PageViewer;
}

/** A row as the query answers it: the values it stores and the title, which a formula may read. */
export interface AttachableRow {
  readonly computedErrors?: Readonly<Record<string, PageFormulaCellError>> | undefined;
  readonly id: string;
  readonly propertyValues: Readonly<Record<string, PagePropertyValue>> | null;
  readonly title: string;
}

/** The property a rollup reads, in the collection it reads it from. */
export interface RollupTarget {
  readonly closedIds: ReadonlySet<string>;
  readonly collectionId: string;
  readonly property: SchemaPropertyDefinition;
  readonly schema: readonly SchemaPropertyDefinition[];
}

export interface GatheredRollup {
  readonly target: PageFormulaPropertyInfo;
  readonly values: ReadonlyMap<string, readonly (PagePropertyValue | undefined)[]>;
}

export interface PreviewComputedRequest {
  readonly computedDraft: ComputedDraft;
  /** Rows to try it on; the first rows of the collection when absent. */
  readonly rowIds?: readonly string[] | undefined;
  readonly excludedRowIds?: readonly string[] | undefined;
  readonly pageId: string;
  readonly role: UserRole;
  /** Also give the value of each part of a formula. */
  readonly trace: boolean;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PreviewedRow {
  readonly id: string;
  readonly outcome: PageFormulaOutcome;
  readonly title: string;
  readonly trace?: readonly PageFormulaTraceStep[] | undefined;
}

export interface PreviewComputedResult {
  /** The columns the formula reads, by label. */
  readonly reads: readonly string[];
  readonly resultType: PageFormulaType;
  readonly rows: readonly PreviewedRow[];
  readonly spaceId: string;
}
