import type { JsonObject, JsonValue } from '@neuma/db';
import type {
  AccessTokenPlace,
  PageContent,
  PageDateValue,
  PagePropertyConfig,
  PagePropertyOption,
  PagePropertyOptionDraft,
  PagePropertyType,
  PagePropertyValues,
  PageViewType,
  Result,
  UserRole,
} from '@neuma/shared';
import type { z } from 'zod';
import type {
  collectionOutputSchema,
  createCollectionInputSchema,
  createRowInputSchema,
  createViewInputSchema,
  deleteViewInputSchema,
  queryCollectionInputSchema,
  queryCollectionOutputSchema,
  rowOutputSchema,
  updateCollectionColumnsInputSchema,
  updateRowInputSchema,
  updateViewInputSchema,
} from '../schemas/mcp.collections.schemas';

export type McpCreateCollectionInput = z.infer<typeof createCollectionInputSchema>;
export type McpQueryCollectionInput = z.infer<typeof queryCollectionInputSchema>;
export type McpCreateRowInput = z.infer<typeof createRowInputSchema>;
export type McpUpdateRowInput = z.infer<typeof updateRowInputSchema>;
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

export type McpViewShapeInput = Partial<Pick<McpCreateViewInput, 'groupBy' | 'sort' | 'visibleColumns' | 'where'>>;

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

/** A column as a request is shaping it: an option added in this request has no id until the collection is saved. */
export interface McpColumnDraft extends McpSchemaColumn {
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
export type McpDescribedColumn = McpSchemaColumn & Partial<Pick<McpColumnDraft, 'config' | 'options'>>;

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

/** Same service as the portal: same validations, access rules and locks. */
export interface McpCollectionService {
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
  readonly queryRows: (
    input: McpActor & { readonly configuration: unknown; readonly pageId: string; readonly viewName: string | null },
  ) => Promise<
    Result<
      {
        readonly attachedFiles: readonly { readonly id: string; readonly name: string }[];
        readonly hasMore: boolean;
        readonly relatedRows: readonly { readonly id: string; readonly title: string }[];
        readonly rows: readonly McpRow[];
      },
      McpRefusal
    >
  >;
  readonly rewriteOption: (
    input: McpActor & {
      readonly optionId: string;
      readonly pageId: string;
      readonly propertyKey: string;
      readonly to: string | null;
    },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  readonly setViewConfiguration: (
    input: McpActor & {
      readonly configuration: JsonObject;
      readonly pageId: string;
      readonly viewName: string;
    },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
}

export interface McpWrittenRow {
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
