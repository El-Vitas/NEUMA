import type { DatabaseLifecycle, DatabaseTemplate } from '@company-brain/db';
import type { UserRole } from '@company-brain/shared';
import type {
  DatabasePropertyDefinition,
  DatabasePropertyValues,
  DatabaseRecordSummary,
  DatabaseViewDefinition,
} from '../domain/database.domain.types';

export type {
  DatabaseBoardColumn,
  DatabasePropertyDefinition,
  DatabasePropertyValue,
  DatabasePropertyValues,
  DatabaseRecordSummary,
  DatabaseViewDefinition,
} from '../domain/database.domain.types';

export interface DatabaseTemplateDefinition {
  readonly name: string;
  readonly properties: readonly DatabasePropertyDefinition[];
  readonly views: readonly DatabaseViewDefinition[];
}

export interface DatabaseSummary {
  readonly id: string;
  readonly workspaceId: string;
  readonly spaceId: string;
  readonly name: string;
  readonly slug: string;
  readonly template: DatabaseTemplate;
  readonly lifecycle: DatabaseLifecycle;
  readonly properties: readonly DatabasePropertyDefinition[];
  readonly views: readonly DatabaseViewDefinition[];
}

export interface CreateDatabaseInput {
  readonly workspaceId: string;
  readonly spaceId: string;
  readonly name: string;
  readonly slug: string;
  readonly template: DatabaseTemplate;
  readonly createdById: string;
  readonly userId: string;
  readonly role: UserRole;
}

export interface CreateRecordInput {
  readonly databaseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly title: string;
  readonly propertyValues: DatabasePropertyValues;
}

export interface UpdateRecordInput extends CreateRecordInput {
  readonly recordId: string;
}

export interface CreatePropertyInput {
  readonly databaseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly property: DatabasePropertyDefinition;
}

export interface CreateViewInput {
  readonly databaseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly view: DatabaseViewDefinition;
}

export interface DatabaseRepositoryContract {
  readonly create: (input: CreateDatabaseInput) => Promise<DatabaseSummary | null>;
  readonly findAccessible: (
    databaseId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<DatabaseSummary | null>;
  readonly listAccessible: (workspaceId: string, userId: string, role: UserRole) => Promise<readonly DatabaseSummary[]>;
  readonly createRecord: (input: CreateRecordInput) => Promise<DatabaseRecordSummary | null>;
  readonly updateRecord: (input: UpdateRecordInput) => Promise<DatabaseRecordSummary | null>;
  readonly createProperty: (input: CreatePropertyInput) => Promise<DatabaseSummary | null>;
  readonly createView: (input: CreateViewInput) => Promise<DatabaseSummary | null>;
  readonly listWorkspaceMemberIds: (workspaceId: string) => Promise<readonly string[]>;
  readonly listRecords: (
    databaseId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<readonly DatabaseRecordSummary[]>;
}
