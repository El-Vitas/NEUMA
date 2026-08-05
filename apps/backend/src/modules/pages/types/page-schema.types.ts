import type { PageLifecycle } from '@company-brain/db';
import type { UserRole } from '@company-brain/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';

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

export interface DefinePageSchemaInput {
  readonly pageId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly views: readonly SchemaViewDefinition[];
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

export interface PageRowsSummary {
  readonly spaceId: string;
  readonly rows: readonly PageRowSummary[];
}

export interface PageSchemaRepositoryContract {
  readonly defineSchema: (
    pageId: string,
    properties: readonly SchemaPropertyDefinition[],
    views: readonly SchemaViewDefinition[],
  ) => Promise<PageSchemaDefinition>;
  readonly getSchema: (pageId: string) => Promise<PageSchemaDefinition>;
  readonly resolveSchemaProperties: (pageId: null | string) => Promise<readonly SchemaPropertyDefinition[]>;
  readonly listRows: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<readonly PageRowSummary[]>;
  readonly listWorkspaceMemberIds: (workspaceId: string) => Promise<readonly string[]>;
}
