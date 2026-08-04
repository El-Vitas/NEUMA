import { Result, USER_ROLE, type UserRole } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_REPOSITORY } from './constants/databases.constants';
import { validateDatabaseProperties, validateRecordValues } from './domain/database.domain';
import {
  DatabaseAccessDeniedError,
  DatabasePropertyValidationError,
  DatabaseRecordValidationError,
  DatabaseViewValidationError,
} from './domain/database.error';
import { validateDatabaseView } from './domain/database.views.validation';
import type {
  CreateDatabaseInput,
  CreatePropertyInput,
  CreateRecordInput,
  CreateViewInput,
  DatabasePropertyValues,
  DatabaseRecordSummary,
  DatabaseRepositoryContract,
  DatabaseSummary,
  UpdateRecordInput,
} from './types/database.types';

@Injectable()
export class DatabasesService {
  constructor(@Inject(DATABASE_REPOSITORY) private readonly databaseRepository: DatabaseRepositoryContract) {}

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly DatabaseSummary[]> {
    return this.databaseRepository.listAccessible(workspaceId, userId, role);
  }

  async getAccessible(
    databaseId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<DatabaseSummary, DatabaseAccessDeniedError>> {
    const database = await this.databaseRepository.findAccessible(databaseId, workspaceId, userId, role);
    return database === null ? Result.fail(new DatabaseAccessDeniedError()) : Result.ok(database);
  }

  async create(
    input: Omit<CreateDatabaseInput, 'createdById' | 'role' | 'userId'>,
    userId: string,
    role: UserRole,
  ): Promise<Result<DatabaseSummary, DatabaseAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new DatabaseAccessDeniedError());
    const database = await this.databaseRepository.create({ ...input, createdById: userId, role, userId });
    return database === null ? Result.fail(new DatabaseAccessDeniedError()) : Result.ok(database);
  }

  async createProperty(
    input: CreatePropertyInput,
  ): Promise<Result<DatabaseSummary, DatabaseAccessDeniedError | DatabasePropertyValidationError>> {
    const database = await this.getWritableDatabase(input.databaseId, input.workspaceId, input.userId, input.role);
    if (database.isFail()) return Result.fail(database.getError());
    const properties = validateDatabaseProperties([...database.getValue().properties, input.property]);
    if (properties.isFail()) return Result.fail(properties.getError());
    const updatedDatabase = await this.databaseRepository.createProperty(input);
    return updatedDatabase === null ? Result.fail(new DatabaseAccessDeniedError()) : Result.ok(updatedDatabase);
  }

  async createRecord(
    input: CreateRecordInput,
  ): Promise<Result<DatabaseRecordSummary, DatabaseAccessDeniedError | DatabaseRecordValidationError>> {
    return this.persistValidatedRecord(input, (record) => this.databaseRepository.createRecord(record));
  }

  async updateRecord(
    input: UpdateRecordInput,
  ): Promise<Result<DatabaseRecordSummary, DatabaseAccessDeniedError | DatabaseRecordValidationError>> {
    return this.persistValidatedRecord(input, (record) =>
      this.databaseRepository.updateRecord({ ...record, recordId: input.recordId }),
    );
  }

  async listRecords(
    databaseId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<readonly DatabaseRecordSummary[], DatabaseAccessDeniedError>> {
    return Result.ok(await this.databaseRepository.listRecords(databaseId, workspaceId, userId, role));
  }

  async createView(
    input: CreateViewInput,
  ): Promise<Result<DatabaseSummary, DatabaseAccessDeniedError | DatabaseViewValidationError>> {
    const database = await this.getWritableDatabase(input.databaseId, input.workspaceId, input.userId, input.role);
    if (database.isFail()) return Result.fail(database.getError());
    const view = validateDatabaseView(input.view, database.getValue().properties);
    if (view.isFail()) return Result.fail(view.getError());
    const updated = await this.databaseRepository.createView(input);
    return updated === null ? Result.fail(new DatabaseAccessDeniedError()) : Result.ok(updated);
  }

  private async getWritableDatabase(
    databaseId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<DatabaseSummary, DatabaseAccessDeniedError>> {
    const database = await this.databaseRepository.findAccessible(databaseId, workspaceId, userId, role);
    if (database === null || role === USER_ROLE.CLIENT) return Result.fail(new DatabaseAccessDeniedError());
    return Result.ok(database);
  }

  private async validateRecordValuesForInput(
    database: DatabaseSummary,
    workspaceId: string,
    input: { readonly title: string; readonly propertyValues: DatabasePropertyValues },
  ): Promise<Result<DatabasePropertyValues, DatabaseRecordValidationError>> {
    const personIds = new Set(await this.databaseRepository.listWorkspaceMemberIds(workspaceId));
    return validateRecordValues(database.properties, { ...input.propertyValues, title: input.title }, personIds);
  }

  private async persistValidatedRecord(
    input: CreateRecordInput,
    persist: (record: CreateRecordInput) => Promise<DatabaseRecordSummary | null>,
  ): Promise<Result<DatabaseRecordSummary, DatabaseAccessDeniedError | DatabaseRecordValidationError>> {
    const database = await this.getWritableDatabase(input.databaseId, input.workspaceId, input.userId, input.role);
    if (database.isFail()) return Result.fail(database.getError());
    const values = await this.validateRecordValuesForInput(database.getValue(), input.workspaceId, input);
    if (values.isFail()) return Result.fail(values.getError());
    const record = await persist({ ...input, propertyValues: values.getValue() });
    return record === null ? Result.fail(new DatabaseAccessDeniedError()) : Result.ok(record);
  }
}
