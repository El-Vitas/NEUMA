import {
  DatabaseLifecycle,
  DatabasePropertyType,
  DatabaseTemplate,
  DatabaseViewType,
  SpaceVisibility,
} from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { canCreateSpace, canReadSpace } from '../../../../common/domain/workspace.policy';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getDatabaseTemplate } from '../../templates/database.templates';
import type {
  CreateDatabaseInput,
  CreatePropertyInput,
  CreateRecordInput,
  CreateViewInput,
  DatabasePropertyDefinition,
  DatabasePropertyValue,
  DatabaseRecordSummary,
  DatabaseRepositoryContract,
  DatabaseSummary,
  DatabaseViewDefinition,
} from '../../types/database.types';

const prismaOrOperator = 'OR';

const getStringOptions = (value: Prisma.JsonValue | null): readonly string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value.filter((item): item is string => typeof item === 'string')
    : null;

const toInputJsonValue = (value: Prisma.JsonValue): Prisma.InputJsonValue | null => {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => toInputJsonValue(item));
  const object: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue === undefined) continue;
    const converted = toInputJsonValue(nestedValue);
    if (converted !== null) object[key] = converted;
  }
  return object;
};

const toPropertyDefinition = (property: {
  key: string;
  label: string;
  type: DatabasePropertyType;
  required: boolean;
  options: Prisma.JsonValue | null;
}): DatabasePropertyDefinition => ({
  key: property.key,
  label: property.label,
  options: getStringOptions(property.options),
  required: property.required,
  type: property.type,
});

const toViewDefinition = (view: {
  name: string;
  type: DatabaseViewType;
  configuration: Prisma.JsonValue;
  isDefault: boolean;
}): DatabaseViewDefinition | null => {
  if (typeof view.configuration !== 'object' || view.configuration === null || Array.isArray(view.configuration))
    return null;
  const configuration: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, value] of Object.entries(view.configuration)) {
    if (value === undefined) continue;
    const converted = toInputJsonValue(value);
    if (converted !== null) configuration[key] = converted;
  }
  return { configuration, isDefault: view.isDefault, name: view.name, type: view.type };
};

const toSummary = (database: {
  id: string;
  workspaceId: string;
  spaceId: string;
  name: string;
  slug: string;
  template: DatabaseTemplate;
  lifecycle: DatabaseLifecycle;
  properties: readonly {
    key: string;
    label: string;
    type: DatabasePropertyType;
    required: boolean;
    options: Prisma.JsonValue | null;
  }[];
  views: readonly { name: string; type: DatabaseViewType; configuration: Prisma.JsonValue; isDefault: boolean }[];
}): DatabaseSummary => ({
  id: database.id,
  lifecycle: database.lifecycle,
  name: database.name,
  properties: database.properties.map(toPropertyDefinition),
  slug: database.slug,
  spaceId: database.spaceId,
  template: database.template,
  views: database.views.flatMap((view) => {
    const definition = toViewDefinition(view);
    return definition === null ? [] : [definition];
  }),
  workspaceId: database.workspaceId,
});

const databaseSelection = {
  id: true,
  lifecycle: true,
  name: true,
  properties: {
    orderBy: { order: 'asc' as const },
    select: { key: true, label: true, options: true, required: true, type: true },
  },
  slug: true,
  spaceId: true,
  template: true,
  views: {
    orderBy: [{ isDefault: 'desc' as const }, { name: 'asc' as const }],
    select: { configuration: true, isDefault: true, name: true, type: true },
  },
  workspaceId: true,
} satisfies Prisma.DatabaseSelect;

@Injectable()
export class DatabaseRepository implements DatabaseRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDatabaseInput): Promise<DatabaseSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const space = await transaction.space.findFirst({
        select: { id: true },
        where: {
          id: input.spaceId,
          workspaceId: input.workspaceId,
          ...this.spaceAccessFilter(input.userId, input.role),
        },
      });
      if (space === null) return null;
      const template = getDatabaseTemplate(input.template);
      const database = await transaction.database.create({
        data: {
          createdById: input.createdById,
          name: input.name,
          properties: {
            create: template.properties.map((property, order) => ({
              key: property.key,
              label: property.label,
              options: property.options === null ? Prisma.JsonNull : [...property.options],
              order,
              required: property.required,
              type: property.type,
            })),
          },
          slug: input.slug,
          spaceId: input.spaceId,
          template: input.template,
          views: {
            create: template.views.map((view) => ({
              configuration: view.configuration,
              isDefault: view.isDefault,
              name: view.name,
              type: view.type,
            })),
          },
          workspaceId: input.workspaceId,
        },
        select: { ...databaseSelection },
      });
      return toSummary(database);
    });
  }

  async findAccessible(
    databaseId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<DatabaseSummary | null> {
    const spaceIds = await this.findAccessibleSpaceIds(workspaceId, userId, role);
    const database = await this.prisma.database.findFirst({
      select: { ...databaseSelection },
      where: { id: databaseId, lifecycle: DatabaseLifecycle.ACTIVE, workspaceId, spaceId: { in: [...spaceIds] } },
    });
    return database === null ? null : toSummary(database);
  }

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly DatabaseSummary[]> {
    const spaceIds = await this.findAccessibleSpaceIds(workspaceId, userId, role);
    const databases = await this.prisma.database.findMany({
      orderBy: [{ spaceId: 'asc' }, { name: 'asc' }],
      select: { ...databaseSelection },
      where: { lifecycle: DatabaseLifecycle.ACTIVE, workspaceId, spaceId: { in: [...spaceIds] } },
    });
    return databases.map(toSummary);
  }

  async createProperty(input: CreatePropertyInput): Promise<DatabaseSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const database = await transaction.database.findFirst({
        select: { id: true, spaceId: true },
        where: { id: input.databaseId, lifecycle: DatabaseLifecycle.ACTIVE, workspaceId: input.workspaceId },
      });
      if (
        database !== null &&
        !(await this.isSpaceAccessible(transaction, database.spaceId, input.workspaceId, input.userId, input.role))
      )
        return null;
      if (database === null) return null;
      await transaction.databaseProperty.create({
        data: {
          databaseId: input.databaseId,
          key: input.property.key,
          label: input.property.label,
          options: input.property.options === null ? Prisma.JsonNull : [...input.property.options],
          order: await this.findNextPropertyOrder(transaction, input.databaseId),
          required: input.property.required,
          type: input.property.type,
        },
      });
      const updated = await transaction.database.findUnique({
        select: { ...databaseSelection },
        where: { id: input.databaseId },
      });
      return updated === null ? null : toSummary(updated);
    });
  }

  async createView(input: CreateViewInput): Promise<DatabaseSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const database = await transaction.database.findFirst({
        select: { id: true, spaceId: true },
        where: { id: input.databaseId, lifecycle: DatabaseLifecycle.ACTIVE, workspaceId: input.workspaceId },
      });
      if (
        database !== null &&
        !(await this.isSpaceAccessible(transaction, database.spaceId, input.workspaceId, input.userId, input.role))
      )
        return null;
      if (database === null) return null;
      await transaction.databaseView.create({
        data: {
          configuration: input.view.configuration,
          databaseId: input.databaseId,
          isDefault: input.view.isDefault,
          name: input.view.name,
          type: input.view.type,
        },
      });
      const updated = await transaction.database.findUnique({
        select: { ...databaseSelection },
        where: { id: input.databaseId },
      });
      return updated === null ? null : toSummary(updated);
    });
  }

  async createRecord(input: CreateRecordInput): Promise<DatabaseRecordSummary | null> {
    const record = await this.prisma.$transaction(async (transaction) => {
      const database = await transaction.database.findFirst({
        select: { id: true, spaceId: true },
        where: { id: input.databaseId, lifecycle: DatabaseLifecycle.ACTIVE, workspaceId: input.workspaceId },
      });
      if (
        database !== null &&
        !(await this.isSpaceAccessible(transaction, database.spaceId, input.workspaceId, input.userId, input.role))
      )
        return null;
      if (database === null) return null;
      const created = await transaction.databaseRecord.create({
        data: {
          createdById: input.userId,
          databaseId: input.databaseId,
          propertyValues: input.propertyValues,
          title: input.title,
          order: await this.findNextRecordOrder(transaction, input.databaseId),
        },
        select: { databaseId: true, id: true, lifecycle: true, order: true, propertyValues: true, title: true },
      });
      return this.toRecordSummary(created);
    });
    return record;
  }

  async updateRecord(input: CreateRecordInput & { readonly recordId: string }): Promise<DatabaseRecordSummary | null> {
    const updated = await this.prisma.$transaction(async (transaction) => {
      const database = await transaction.database.findFirst({
        select: { id: true, spaceId: true },
        where: { id: input.databaseId, lifecycle: DatabaseLifecycle.ACTIVE, workspaceId: input.workspaceId },
      });
      if (
        database !== null &&
        !(await this.isSpaceAccessible(transaction, database.spaceId, input.workspaceId, input.userId, input.role))
      )
        return null;
      if (database === null) return null;
      return transaction.databaseRecord.updateMany({
        data: { propertyValues: input.propertyValues, title: input.title },
        where: {
          databaseId: input.databaseId,
          database: { lifecycle: DatabaseLifecycle.ACTIVE, workspaceId: input.workspaceId },
          id: input.recordId,
          lifecycle: DatabaseLifecycle.ACTIVE,
        },
      });
    });
    if (updated === null || updated.count === 0) return null;
    const record = await this.prisma.databaseRecord.findUnique({
      select: { databaseId: true, id: true, lifecycle: true, order: true, propertyValues: true, title: true },
      where: {
        database: { lifecycle: DatabaseLifecycle.ACTIVE, workspaceId: input.workspaceId },
        id: input.recordId,
        lifecycle: DatabaseLifecycle.ACTIVE,
      },
    });
    return record === null ? null : this.toRecordSummary(record);
  }

  async listWorkspaceMemberIds(workspaceId: string): Promise<readonly string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      select: { userId: true },
      where: { workspaceId, user: { isActive: true } },
      orderBy: { userId: 'asc' },
    });
    return members.map((member) => member.userId);
  }

  async listRecords(
    databaseId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly DatabaseRecordSummary[]> {
    const spaceIds = await this.findAccessibleSpaceIds(workspaceId, userId, role);
    const records = await this.prisma.databaseRecord.findMany({
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: { databaseId: true, id: true, lifecycle: true, order: true, propertyValues: true, title: true },
      where: {
        databaseId,
        database: { lifecycle: DatabaseLifecycle.ACTIVE, workspaceId, spaceId: { in: [...spaceIds] } },
        lifecycle: DatabaseLifecycle.ACTIVE,
      },
    });
    return records.map((record) => this.toRecordSummary(record));
  }

  private spaceAccessFilter(userId: string, role: UserRole): Prisma.SpaceWhereInput {
    return {
      [prismaOrOperator]: [
        { visibility: SpaceVisibility.PUBLIC_INTERNAL },
        ...(canReadSpace(role, SpaceVisibility.RESTRICTED, false)
          ? [{ visibility: SpaceVisibility.RESTRICTED }]
          : [{ members: { some: { userId } }, visibility: SpaceVisibility.RESTRICTED }]),
      ],
    };
  }

  private async findAccessibleSpaceIds(
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly string[]> {
    const spaces = await this.prisma.space.findMany({
      select: { id: true },
      where: { workspaceId, ...this.spaceAccessFilter(userId, role) },
    });
    return spaces.map((space) => space.id);
  }

  private async isSpaceAccessible(
    transaction: Prisma.TransactionClient,
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<boolean> {
    if (!canCreateSpace(role)) return false;
    const space = await transaction.space.findFirst({
      select: { id: true },
      where: { id: spaceId, workspaceId, ...this.spaceAccessFilter(userId, role) },
    });
    return space !== null;
  }

  private async findNextPropertyOrder(transaction: Prisma.TransactionClient, databaseId: string): Promise<number> {
    const property = await transaction.databaseProperty.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
      where: { databaseId },
    });
    return (property?.order ?? -1) + 1;
  }

  private async findNextRecordOrder(transaction: Prisma.TransactionClient, databaseId: string): Promise<number> {
    const record = await transaction.databaseRecord.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
      where: { databaseId },
    });
    return (record?.order ?? -1) + 1;
  }

  private toRecordSummary(record: {
    databaseId: string;
    id: string;
    lifecycle: DatabaseLifecycle;
    order: number;
    propertyValues: Prisma.JsonValue;
    title: string;
  }): DatabaseRecordSummary {
    const propertyValues: Record<string, DatabasePropertyValue> = {};
    if (
      typeof record.propertyValues === 'object' &&
      record.propertyValues !== null &&
      !Array.isArray(record.propertyValues)
    ) {
      for (const [key, value] of Object.entries(record.propertyValues)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
          propertyValues[key] = value;
        if (Array.isArray(value) && value.every((item) => typeof item === 'string'))
          propertyValues[key] = value.filter((item): item is string => typeof item === 'string');
      }
    }
    return {
      databaseId: record.databaseId,
      id: record.id,
      lifecycle: record.lifecycle,
      order: record.order,
      propertyValues,
      title: record.title,
    };
  }
}
