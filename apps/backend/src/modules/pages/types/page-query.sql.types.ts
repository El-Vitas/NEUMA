import type { PageFilter, PageFilterCondition, PagePropertyValue, PageSort } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import type { NeumaSqlRunner } from '../../../prisma/types/prisma.types';
import type { GroupingPlan } from '../domain/page-query.grouping.domain.types';

export type SqlParameter = boolean | number | string;

export type SqlType = 'boolean' | 'float8' | 'int' | 'jsonb' | 'numeric' | 'text' | 'timestamptz';

/**
 * A piece of a statement: text with its bound values. Pieces compose by interpolation, so a filter of any depth
 * becomes one statement whose every value is a bound parameter, never part of the text.
 */
export interface SqlFragment {
  /** One more part than there are values: the text before the first value, between values, and after the last. */
  readonly parts: readonly string[];
  readonly values: readonly SqlParameter[];
}

export interface FragmentBuilder {
  parts: string[];
  values: SqlParameter[];
}

/** Ids of the target rows that the reader cannot open, by relation property; `ALL` when the whole target is closed. */
export type UnreadableRelations = ReadonlyMap<string, 'ALL' | readonly string[]>;

export interface CellContext {
  /**
   * The value of each computed property for the candidate rows, as the JSON text of an object by row id (ADR 028).
   * A computed property reads from here as a stored one reads from the row: the compiler has one way to read a cell.
   */
  readonly computedValues: ReadonlyMap<string, string>;
  /** The zone of the viewer, which decides what day an instant belongs to. */
  readonly timeZone: string;
  readonly unreadableRelations: UnreadableRelations;
}

export type EmptinessKind = 'BLANK_TEXT' | 'DATE_ABSENT' | 'EMPTY_LIST' | 'NEVER_EMPTY';

/** A column of the order of a query. A value of NULL always goes last, in both directions. */
export interface OrderColumn {
  readonly direction: 'ASC' | 'DESC';
  readonly expression: SqlFragment;
  readonly type: SqlType;
}

export interface SortKey {
  readonly expression: SqlFragment;
  readonly type: SqlType;
}

/** The two ends of what a date has and of what a condition compares with, in the same unit (days or instants). */
export interface RangeEnds {
  readonly argumentEnd: SqlFragment;
  readonly argumentStart: SqlFragment;
  readonly valueEnd: SqlFragment;
  readonly valueStart: SqlFragment;
}

export interface PredicateInput {
  readonly argument: PagePropertyValue;
  readonly cell: SqlFragment;
  readonly operator: PageFilterCondition['operator'];
  readonly property: SchemaPropertyDefinition;
  readonly timeZone: string;
}

export type Predicate = (input: PredicateInput) => SqlFragment | null;

export type PredicateTable = Readonly<Partial<Record<PageFilterCondition['operator'], Predicate>>>;

export type StatementObserver = (statement: SqlFragment) => Promise<void>;

/** What every reducer of one query shares: which rows, in which order, as the reader may see them. */
export interface QueryScope {
  readonly baseWhere: SqlFragment;
  readonly collectionId: string;
  readonly context: CellContext;
  /** Handed every statement before it runs; the tests that check the plan of a query use it. */
  readonly onStatement: StatementObserver | null;
  readonly orderColumns: readonly OrderColumn[];
  readonly properties: ReadonlyMap<string, SchemaPropertyDefinition>;
  /** The connection of the snapshot the reducers of one request read from. */
  readonly runner: NeumaSqlRunner;
  readonly signature: string;
  readonly viewId: string | null;
}

export interface QueryScopeInput {
  readonly collectionId: string;
  readonly computedValues?: ReadonlyMap<string, string> | undefined;
  readonly deniedIds: readonly string[];
  readonly filter: PageFilter | null;
  readonly onStatement?: StatementObserver | undefined;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly runner: NeumaSqlRunner;
  readonly search: string | null;
  readonly signature: string;
  readonly sorts: readonly PageSort[];
  readonly timeZone: string;
  readonly unreadableRelations: UnreadableRelations;
  readonly viewId: string | null;
}

export interface GroupAxis {
  readonly inclusion: SqlFragment;
  readonly plan: GroupingPlan;
}

/** A row the scope lets through, with what formulas and rollups read from it (ADR 028). */
export interface CandidateRow {
  readonly createdAt: string;
  readonly createdById: string;
  readonly editedAt: string;
  readonly editedById: string;
  readonly id: string;
  readonly title: string;
  /** The JSON text of the values the row stores. */
  readonly valuesJson: string | null;
}

export interface RowPage {
  readonly ids: readonly string[];
  readonly nextCursor: string | null;
}

export interface GroupLine {
  readonly key: string | null;
  readonly page: RowPage;
  readonly subKey: string | null;
}

export interface AggregateLine {
  readonly key: string | null;
  readonly subKey: string | null;
  readonly values: readonly (string | null)[];
}

export interface AggregateResult {
  readonly distinctRowCount: number;
  readonly groups: readonly AggregateLine[];
  readonly totals: readonly (string | null)[];
}

export type ResultRow = Readonly<Record<string, unknown>>;

export interface TextColumn {
  readonly codecId: 'pg/text@1';
  readonly nullable: boolean;
}

export type RowSpec = Record<string, TextColumn>;
