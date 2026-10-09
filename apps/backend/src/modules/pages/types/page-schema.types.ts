import type { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';
import type { SCHEMA_CHANGED_MEANWHILE, SCHEMA_OPTION_ALREADY_MOVED } from '../constants/pages.constants';

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
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly views: readonly SchemaViewDefinition[];
  /** The shape the caller based this on; if the stored shape differs, nothing is saved. */
  readonly readShape?: PageSchemaShape;
}

export interface PageRowSummary {
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
  readonly hasMore: boolean;
  readonly rows: readonly PageRowSummary[];
}

/** With neither a view name nor a configuration, all rows are returned. */
export interface QueryPageRowsInput {
  /** Custom filter and sort, shaped like a view configuration. */
  readonly configuration: unknown;
  readonly pageId: string;
  readonly role: UserRole;
  readonly userId: string;
  readonly viewName: string | null;
  readonly workspaceId: string;
}

export interface PageRowsSummary {
  readonly hasMore: boolean;
  readonly spaceId: string;
  readonly rows: readonly PageRowSummary[];
}

export interface SetPageViewConfigurationInput {
  readonly configuration: Prisma.InputJsonObject;
  readonly pageId: string;
  readonly role: UserRole;
  readonly userId: string;
  readonly viewName: string;
  readonly workspaceId: string;
}

/** A null `to` removes the option and clears it from the rows. */
export interface RewritePageOptionInput {
  readonly from: string;
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
    readShape?: PageSchemaShape,
  ) => Promise<PageSchemaDefinition | typeof SCHEMA_CHANGED_MEANWHILE>;
  /** Rewrites schema and row values together, otherwise rows would keep the old option name. */
  readonly rewriteOption: (
    pageId: string,
    propertyKey: string,
    rename: { readonly from: string; readonly to: null | string },
    properties: readonly SchemaPropertyDefinition[],
  ) => Promise<PageSchemaDefinition | typeof SCHEMA_OPTION_ALREADY_MOVED>;
  readonly setViewConfiguration: (
    pageId: string,
    viewName: string,
    configuration: Prisma.InputJsonObject,
  ) => Promise<PageSchemaDefinition>;
  readonly getSchema: (pageId: string) => Promise<PageSchemaDefinition>;
  readonly resolveSchemaProperties: (pageId: null | string) => Promise<readonly SchemaPropertyDefinition[]>;
  readonly listPersonPropertyKeys: (pageIds: readonly string[]) => Promise<ReadonlyMap<string, readonly string[]>>;
  readonly listRows: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    limit: number,
  ) => Promise<PageRowsPage>;
  readonly listWorkspaceMemberIds: (workspaceId: string) => Promise<readonly string[]>;
}
