import type { Prisma } from '@neuma/db/generated';
import type {
  AccessTokenPlace,
  PagePropertyOption,
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

export type McpCellInput = string | number | boolean | readonly string[] | null;

/** Names all existing items so the agent can correct, or none for a token that can change but not read. */
export type McpNameLister = (names: readonly string[]) => string | null;

export type McpColumnStep = (
  columns: readonly McpColumn[],
  changes: McpColumnChanges,
  listNames: McpNameLister,
) => Result<McpColumn[], string>;

export interface McpColumnsInHand {
  readonly columns: readonly McpColumn[];
  readonly listNames: McpNameLister;
}

export type McpCellValue = string | number | boolean | string[] | null;

export type McpViewShapeInput = Partial<Pick<McpCreateViewInput, 'groupBy' | 'sort' | 'visibleColumns' | 'where'>>;

/** Removed when it has no new name; rows holding the option are rewritten. */
export interface McpOptionRewrite {
  readonly from: string;
  readonly propertyKey: string;
  readonly to: string | null;
}

export type McpColumnChanges = Omit<McpUpdateCollectionColumnsInput, 'collection'>;

export interface McpColumnChangesPlan {
  readonly optionRewrites: readonly McpOptionRewrite[];
  readonly properties: readonly McpColumn[];
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

export interface McpColumn extends McpSchemaColumn {
  readonly options: readonly PagePropertyOption[] | null;
  readonly required: boolean;
  readonly type: PagePropertyType;
}

export interface McpView {
  readonly configuration: Prisma.InputJsonObject;
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

export interface McpActor {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Same service as the portal: same validations, access rules and locks. */
export interface McpCollectionService {
  /** When the shape that was read is passed, saves only if it is still current. */
  readonly defineSchema: (
    input: McpActor & McpCollectionShape & { readonly pageId: string; readonly readShape?: McpCollectionShape },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  readonly getSchema: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  readonly queryRows: (
    input: McpActor & { readonly configuration: unknown; readonly pageId: string; readonly viewName: string | null },
  ) => Promise<Result<{ readonly hasMore: boolean; readonly rows: readonly McpRow[] }, McpRefusal>>;
  readonly rewriteOption: (
    input: McpActor & {
      readonly from: string;
      readonly pageId: string;
      readonly propertyKey: string;
      readonly to: string | null;
    },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  readonly setViewConfiguration: (
    input: McpActor & {
      readonly configuration: Prisma.InputJsonObject;
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
  readonly create: (
    input: McpActor & {
      readonly content: Prisma.InputJsonValue;
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
