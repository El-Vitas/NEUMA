import type { PageLifecycle } from '@neuma/db';
import type { PageFormulaCellError, UserRole } from '@neuma/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';
import type { SCHEMA_CHANGED_MEANWHILE, SCHEMA_OPTION_ALREADY_MOVED } from '../constants/pages.constants';
import type {
  ComputedDraft,
  PageSchemaSideEffects,
  RollupDependent,
  SchemaPropertyDraft,
} from '../domain/page-schema.domain.types';
import type { PageViewer } from './page.block.types';

export type {
  SchemaPropertyDefinition,
  SchemaPropertyValue,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';

export interface PageSchemaDefinition {
  readonly pageId: string;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly views: readonly SchemaViewDefinition[];
}

export interface PageSchemaSummary extends PageSchemaDefinition {
  readonly spaceId: string;
}

export interface PageSchemaShape {
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly views: readonly SchemaViewDefinition[];
}

export interface DefinePageSchemaInput {
  readonly pageId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly properties: readonly SchemaPropertyDraft[];
  readonly views: readonly SchemaViewDefinition[];
  /** The shape the caller based this on; if the stored shape differs, nothing is saved. */
  readonly readShape?: PageSchemaShape;
}

/** A formula or rollup to check against a collection without saving it. */
export interface PreviewComputedInput {
  readonly computedDraft: ComputedDraft;
  readonly pageId: string;
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PreviewedSchema {
  /** The schema with the checked column last, its formula or rollup planned. */
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly spaceId: string;
}

export interface PageRowAuthorshipSummary {
  readonly createdAt: Date;
  readonly createdById: string;
  readonly editedAt: Date;
  readonly editedById: string;
}

export interface PageRowSummary extends PageRowAuthorshipSummary {
  /** The formulas and rollups of the row that could not be computed, with why (ADR 028). */
  readonly computedErrors?: Readonly<Record<string, PageFormulaCellError>> | undefined;
  readonly id: string;
  readonly parentId: null | string;
  readonly spaceId: string;
  readonly title: string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly order: number;
  readonly lifecycle: PageLifecycle;
}

/** `hasMore` travels with the rows so a truncated list is not read as the whole collection. */
export interface PageRowsPage {
  /** The files the rows attach, with the facts a cell shows. */
  readonly attachedFiles: readonly { id: string; mimeType: string; name: string; size: number }[];
  readonly hasMore: boolean;
  /** The rows the relation cells point to that the reader may open, so a cell can show their titles. */
  readonly relatedRows: readonly { id: string; title: string }[];
  readonly rows: readonly PageRowSummary[];
}

/** A null `to` removes the option and clears it from the rows; a name only renames it, and no row moves. */
export interface RewritePageOptionInput {
  readonly optionId: string;
  readonly pageId: string;
  readonly propertyKey: string;
  readonly role: UserRole;
  readonly to: null | string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageSchemaRepositoryContract {
  /** With `readShape`, saves only if the stored shape still equals it. */
  readonly defineSchema: (
    pageId: string,
    shape: PageSchemaShape,
    readShape: PageSchemaShape | undefined,
    sideEffects: PageSchemaSideEffects,
    writer: PageViewer,
  ) => Promise<PageSchemaDefinition | typeof SCHEMA_CHANGED_MEANWHILE>;
  /** A removal also clears the rows that held the option, so none keeps an id the schema dropped. */
  readonly rewriteOption: (
    pageId: string,
    propertyKey: string,
    change: {
      readonly optionId: string;
      readonly replacementId: null | string;
      readonly to: null | string;
    },
    properties: readonly SchemaPropertyDefinition[],
    writer: PageViewer,
  ) => Promise<PageSchemaDefinition | typeof SCHEMA_OPTION_ALREADY_MOVED>;
  readonly getSchema: (pageId: string) => Promise<PageSchemaDefinition>;
  /** The rollups of other collections that read a property of this one. */
  readonly listRollupDependents: (pageId: string) => Promise<readonly RollupDependent[]>;
  readonly resolveSchemaProperties: (pageId: null | string) => Promise<readonly SchemaPropertyDefinition[]>;
  readonly listPersonPropertyKeys: (pageIds: readonly string[]) => Promise<ReadonlyMap<string, readonly string[]>>;
  readonly readRowsById: (
    pageId: string,
    rowIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageRowsPage>;
  readonly listWorkspaceMemberIds: (workspaceId: string) => Promise<readonly string[]>;
  /** The pages among `pageIds` that carry a shape, that is, the collections. */
  readonly findCollectionIds: (pageIds: readonly string[]) => Promise<ReadonlySet<string>>;
  /** The files among `fileIds` the writer may attach: active, in the workspace, and theirs or already the page's. */
  readonly findAttachableFileIds: (
    fileIds: readonly string[],
    scope: { readonly pageId: null | string; readonly userId: string; readonly workspaceId: string },
  ) => Promise<ReadonlySet<string>>;
  /** A file attached to a row belongs to that row from then on, so removing the row cleans it up. */
  readonly attachFilesToPage: (pageId: string, fileIds: readonly string[]) => Promise<void>;
}
