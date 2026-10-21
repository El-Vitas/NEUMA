import type { JsonObject, JsonValue } from '@neuma/db';
import type {
  AccessTokenPlace,
  PageComputedConfig,
  PageContent,
  PageDateValue,
  PageFormulaCellError,
  PageFormulaOutcome,
  PageFormulaTraceStep,
  PagePropertyConfig,
  PagePropertyOption,
  PagePropertyOptionDraft,
  PagePropertyType,
  PagePropertyValues,
  PageQueryOutcome,
  PageQueryRequest,
  PageViewType,
  PageViewWireOperation,
  Result,
  UserRole,
} from '@neuma/shared';
import type { z } from 'zod';
import type {
  collectionChangesInputSchema,
  collectionChangesOutputSchema,
  collectionOutputSchema,
  createCollectionInputSchema,
  createRowInputSchema,
  createViewInputSchema,
  deleteViewInputSchema,
  moveRowInputSchema,
  queryCollectionInputSchema,
  queryCollectionOutputSchema,
  rowOutputSchema,
  testFormulaInputSchema,
  testFormulaOutputSchema,
  updateCollectionColumnsInputSchema,
  updateRowInputSchema,
  updateViewInputSchema,
} from '../schemas/mcp.collections.schemas';

export type McpCreateCollectionInput = z.infer<typeof createCollectionInputSchema>;
export type McpQueryCollectionInput = z.infer<typeof queryCollectionInputSchema>;
export type McpCollectionChangesInput = z.infer<typeof collectionChangesInputSchema>;
export type McpCollectionChangesOutput = z.infer<typeof collectionChangesOutputSchema>;
export type McpTestFormulaInput = z.infer<typeof testFormulaInputSchema>;
export type McpTestFormulaOutput = z.infer<typeof testFormulaOutputSchema>;
export type McpPreviewValue = McpTestFormulaOutput['rows'][number]['value'];
export type McpCreateRowInput = z.infer<typeof createRowInputSchema>;
export type McpUpdateRowInput = z.infer<typeof updateRowInputSchema>;
export type McpMoveRowInput = z.infer<typeof moveRowInputSchema>;
export type McpUpdateCollectionColumnsInput = z.infer<typeof updateCollectionColumnsInputSchema>;
export type McpCreateViewInput = z.infer<typeof createViewInputSchema>;
export type McpUpdateViewInput = z.infer<typeof updateViewInputSchema>;
export type McpDeleteViewInput = z.infer<typeof deleteViewInputSchema>;
export type McpCollectionOutput = z.infer<typeof collectionOutputSchema>;
export type McpQueryCollectionOutput = z.infer<typeof queryCollectionOutputSchema>;
export type McpRowOutput = z.infer<typeof rowOutputSchema>;

/** What a relation cell takes besides a list that replaces it: rows to link and rows to unlink, one by one. */
export interface McpRelationInput {
  readonly add?: readonly string[] | undefined;
  readonly remove?: readonly string[] | undefined;
}

export type McpCellInput = string | number | boolean | readonly string[] | McpRelationInput | null;

/**
 * What a request asks of a relation cell, with the rows still named as the agent named them. `set` replaces the
 * cell as a whole and is turned into links and unlinks against what the row has.
 */
export interface McpRelationRequest {
  readonly add: readonly string[];
  readonly column: McpColumnDraft;
  readonly remove: readonly string[];
  readonly set: readonly string[] | null;
}

/** A row of the collection a relation points to that the token can read. */
export interface McpRelationCandidate {
  readonly id: string;
  readonly title: string;
}

export interface McpRelationTarget {
  readonly listNames: McpNameLister;
  readonly rows: readonly McpRelationCandidate[];
  readonly title: string;
}

/** One link or one unlink, with the row already found. */
export interface McpRelationChange {
  readonly kind: 'ADD' | 'REMOVE';
  readonly propertyKey: string;
  readonly targetId: string;
}

/** Names all existing items so the agent can correct, or none for a token that can change but not read. */
export type McpNameLister = (names: readonly string[]) => string | null;

export type McpColumnStep = (
  columns: readonly McpColumnDraft[],
  changes: McpColumnChanges,
  listNames: McpNameLister,
) => Result<McpColumnDraft[], string>;

export interface McpColumnsInHand {
  readonly columns: readonly McpColumnDraft[];
  readonly listNames: McpNameLister;
}

export type McpCellValue = string | number | boolean | string[] | PageDateValue | null;

/** What a condition compares with: one plain value, or nothing for the emptiness conditions. */
export type McpConditionValue = Exclude<McpCellValue, PageDateValue>;

export type McpViewShapeInput = Partial<
  Pick<
    McpCreateViewInput,
    | 'cardSize'
    | 'coverColumn'
    | 'dateColumn'
    | 'endDateColumn'
    | 'groupBy'
    | 'scale'
    | 'sort'
    | 'subGroupBy'
    | 'visibleColumns'
    | 'where'
  >
>;

/** Removed when it has no new name. Rows keep the id, so a rename moves none; a removal clears the rows. */
export interface McpOptionRewrite {
  /** The name the option has now, to say what the change did. */
  readonly from: string;
  readonly optionId: string;
  readonly propertyKey: string;
  readonly to: string | null;
}

export type McpColumnChanges = Omit<McpUpdateCollectionColumnsInput, 'collection'>;

export interface McpColumnChangesPlan {
  readonly optionRewrites: readonly McpOptionRewrite[];
  readonly properties: readonly McpColumnDraft[];
}

/** What a request wants saved: the columns with the options it added, which the server gives their ids. */
export interface McpShapeDraft {
  readonly properties: readonly McpColumnDraft[];
  readonly views: readonly McpView[];
}

export interface McpRefusal {
  readonly code: string;
  readonly details: unknown;
}

export interface McpSchemaColumn {
  readonly key: string;
  readonly label: string;
  readonly type: string;
}

/** What a request says of a formula or a rollup column, in the names people read; the server turns them into keys. */
export interface McpComputedDraft {
  readonly formula: string | null;
  readonly rollup: {
    readonly calculation: string;
    readonly relationPropertyKey: string;
    readonly targetPropertyKey: string;
  } | null;
}

/** A column as a request is shaping it: an option added in this request has no id until the collection is saved. */
export interface McpColumnDraft extends McpSchemaColumn {
  /** A formula or rollup the column has, as it is saved. */
  readonly computed?: PageComputedConfig | undefined;
  /** A formula or rollup the request gives; without it the column keeps the one it has. */
  readonly computedDraft?: McpComputedDraft | null | undefined;
  readonly config: PagePropertyConfig;
  readonly options: readonly PagePropertyOptionDraft[] | null;
  readonly required: boolean;
  /** Only on a relation that is being added: the other collection also gets the column that links back. */
  readonly twoWay?: boolean;
  readonly type: PagePropertyType;
}

/** A column as it is saved: every option has its id. */
export interface McpColumn extends McpColumnDraft {
  readonly options: readonly PagePropertyOption[] | null;
}

export interface McpView {
  readonly configuration: JsonObject;
  /** Absent in a view the agent is still drafting. */
  readonly id?: string | undefined;
  readonly isDefault: boolean;
  readonly name: string;
  readonly type: PageViewType;
}

export interface McpCollectionShape {
  readonly properties: readonly McpColumn[];
  readonly views: readonly McpView[];
}

export interface McpOpenCollection {
  readonly id: string;
  readonly listNames: McpNameLister;
  readonly place: AccessTokenPlace;
  readonly shape: McpCollectionShape;
  readonly spaceId: string;
  readonly title: string;
}

export interface McpRow {
  readonly id: string;
  readonly order: number;
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
}

/** What describing a row needs of a column: the shape alone, and the settings when the collection has been read. */
export type McpDescribedColumn = McpSchemaColumn & Partial<Pick<McpColumnDraft, 'computed' | 'config' | 'options'>>;

/** A column an agent asks to add, as the request names it. */
export type McpNewColumn = NonNullable<McpColumnChanges['addColumns']>[number];

/** The rows and files the cells of a read point to, with the names a reader sees. */
export interface McpRowLookups {
  readonly files: ReadonlyMap<string, string>;
  readonly rows: ReadonlyMap<string, string>;
}

export interface McpActor {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** A view after an operation: what the next operation builds on. */
export interface McpChangedView {
  readonly configuration: JsonObject;
  readonly id: string;
  readonly version: number;
}

/** Same service as the portal: same validations, access rules and locks. */
export interface McpCollectionService {
  /** Each operation touches one key or one element of the view, so two editors never undo each other. */
  readonly applyViewOperations: (
    input: McpActor & {
      readonly operations: readonly PageViewWireOperation[];
      readonly pageId: string;
      readonly viewId: string;
    },
  ) => Promise<Result<McpChangedView, McpRefusal>>;
  /** When the shape that was read is passed, saves only if it is still current. */
  readonly defineSchema: (
    input: McpActor & {
      readonly pageId: string;
      readonly properties: readonly McpColumnDraft[];
      readonly readShape?: McpCollectionShape;
      readonly views: readonly McpView[];
    },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  readonly getSchema: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  /** Tries a formula or a rollup on a few rows without saving it: its type, what it reads and its values. */
  readonly previewComputed: (
    input: McpActor & {
      readonly computedDraft: McpComputedDraft;
      readonly excludedRowIds: readonly string[];
      readonly pageId: string;
      readonly rowIds?: readonly string[] | undefined;
      readonly trace: boolean;
    },
  ) => Promise<Result<McpComputedPreview, McpRefusal>>;
  /** The new values of the row and its place in the view are written together: it never moves halfway. */
  readonly moveRow: (
    input: McpActor & {
      readonly after?: string;
      readonly before?: string;
      readonly pageId: string;
      readonly rowId: string;
      readonly values: Readonly<Record<string, unknown>>;
      readonly viewId: string;
    },
  ) => Promise<Result<McpChangedView, McpRefusal>>;
  /** What `query_collection` asks: the reducers of the portal's query, over rows this token may read. */
  readonly queryCollection: (
    input: McpActor & {
      readonly excludedRowIds: readonly string[];
      readonly pageId: string;
      readonly request: PageQueryRequest;
    },
  ) => Promise<Result<McpQueryAnswer, McpRefusal>>;
  /** What `collection_changes` asks: the rows written since a cursor, for the rows this token may read. */
  readonly readChanges: (
    input: McpActor & {
      readonly cursor: string | undefined;
      readonly excludedRowIds: readonly string[];
      readonly limit: number;
      readonly pageId: string;
    },
  ) => Promise<Result<McpChangesAnswer, McpRefusal>>;
  readonly rewriteOption: (
    input: McpActor & {
      readonly optionId: string;
      readonly pageId: string;
      readonly propertyKey: string;
      readonly to: string | null;
    },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
}

export interface McpComputedPreview {
  /** The columns the formula reads, by name. */
  readonly reads: readonly string[];
  readonly resultType: string;
  readonly rows: readonly {
    readonly id: string;
    readonly outcome: PageFormulaOutcome;
    readonly title: string;
    readonly trace?: readonly PageFormulaTraceStep[] | undefined;
  }[];
  readonly spaceId: string;
}

export interface McpChangesAnswer {
  readonly attachedFiles: readonly { readonly id: string; readonly name: string }[];
  readonly cursor: string;
  readonly hasMore: boolean;
  readonly isReset: boolean;
  /** Rows whose rollups may have changed because a row they summarise did. */
  readonly possiblyChanged: readonly McpWrittenRow[];
  readonly possiblyChangedIsTruncated: boolean;
  readonly rows: readonly McpWrittenRow[];
  readonly total: number;
  readonly trashedIds: readonly string[];
}

export interface McpQueryAnswer {
  readonly attachedFiles: readonly { readonly id: string; readonly name: string }[];
  readonly changesCursor: string;
  readonly reducers: Readonly<Record<string, PageQueryOutcome>>;
  readonly rows: Readonly<Record<string, McpWrittenRow>>;
}

export interface McpWrittenRow {
  /** The formulas and rollups of the row that could not be computed, with why. */
  readonly computedErrors?: Readonly<Record<string, PageFormulaCellError>> | undefined;
  readonly id: string;
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
}

export interface McpRowWriter {
  /**
   * Links and unlinks rows of a relation cell in one transaction, so they all apply or none does, and the other side
   * of a two-way relation follows. Whoever may not edit that other side has the whole change refused.
   */
  readonly changeRelations: (
    input: McpActor & {
      readonly changes: readonly McpRelationChange[];
      readonly rowId: string;
      readonly spaceId: string;
    },
  ) => Promise<Result<boolean, McpRefusal>>;
  readonly create: (
    input: McpActor & {
      readonly content: JsonValue | PageContent;
      readonly parentId: string | null;
      readonly propertyValues: PagePropertyValues | null;
      readonly spaceId: string;
      /** Undefined takes the default template of the collection; null asks for none. */
      readonly templateId?: null | string;
      readonly timeZone?: string;
      readonly title: string;
    },
  ) => Promise<Result<McpWrittenRow, McpRefusal>>;
  /** Argument order follows the pages service: requester before workspace. */
  readonly rename: (
    pageId: string,
    title: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<Result<McpWrittenRow, McpRefusal>>;
  readonly updateProperties: (
    input: McpActor & {
      readonly pageId: string;
      readonly propertyValues: Readonly<Record<string, unknown>>;
      readonly title?: string;
      readonly updatedById: string;
    },
  ) => Promise<Result<McpWrittenRow, McpRefusal>>;
}
