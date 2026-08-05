import { PageLifecycle } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from '../../../../common/domain/schema.domain.types';
import { parseSchemaPropertyValues } from '../../../../common/domain/schema-property.domain';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PageRowSummary, PageSchemaDefinition, PageSchemaRepositoryContract } from '../../types/page-schema.types';

const getStringOptions = (value: Prisma.JsonValue | null): readonly string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value.filter((item): item is string => typeof item === 'string')
    : null;

const toPropertyDefinition = (property: {
  key: string;
  label: string;
  type: SchemaPropertyDefinition['type'];
  required: boolean;
  options: Prisma.JsonValue | null;
}): SchemaPropertyDefinition => ({
  key: property.key,
  label: property.label,
  options: getStringOptions(property.options),
  required: property.required,
  type: property.type,
});

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

const toViewDefinition = (view: {
  name: string;
  type: SchemaViewDefinition['type'];
  configuration: Prisma.JsonValue;
  isDefault: boolean;
}): SchemaViewDefinition | null => {
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

const schemaPropertySelection = {
  key: true,
  label: true,
  options: true,
  required: true,
  type: true,
} satisfies Prisma.PageSchemaPropertySelect;

const schemaViewSelection = {
  configuration: true,
  isDefault: true,
  name: true,
  type: true,
} satisfies Prisma.PageSchemaViewSelect;

const pageRowSelection = {
  id: true,
  lifecycle: true,
  order: true,
  parentId: true,
  propertyValues: true,
  spaceId: true,
  title: true,
} satisfies Prisma.PageSelect;

@Injectable()
export class PageSchemaRepository implements PageSchemaRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async resolveSchemaProperties(pageId: null | string): Promise<readonly SchemaPropertyDefinition[]> {
    if (pageId === null) return [];
    const properties = await this.prisma.pageSchemaProperty.findMany({
      orderBy: { order: 'asc' },
      select: schemaPropertySelection,
      where: { pageId },
    });
    return properties.map(toPropertyDefinition);
  }

  async getSchema(pageId: string): Promise<PageSchemaDefinition> {
    return this.loadSchemaSummary(this.prisma, pageId);
  }

  async defineSchema(
    pageId: string,
    properties: readonly SchemaPropertyDefinition[],
    views: readonly SchemaViewDefinition[],
  ): Promise<PageSchemaDefinition> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.pageSchemaProperty.deleteMany({ where: { pageId } });
      await transaction.pageSchemaView.deleteMany({ where: { pageId } });
      await transaction.pageSchemaProperty.createMany({
        data: properties.map((property, order) => ({
          key: property.key,
          label: property.label,
          options: property.options === null ? Prisma.JsonNull : [...property.options],
          order,
          pageId,
          required: property.required,
          type: property.type,
        })),
      });
      await transaction.pageSchemaView.createMany({
        data: views.map((view) => ({
          configuration: view.configuration,
          isDefault: view.isDefault,
          name: view.name,
          pageId,
          type: view.type,
        })),
      });
      return this.loadSchemaSummary(transaction, pageId);
    });
  }

  async listRows(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly PageRowSummary[]> {
    const rows = await this.prisma.page.findMany({
      orderBy: { order: 'asc' },
      select: pageRowSelection,
      where: {
        lifecycle: PageLifecycle.ACTIVE,
        parentId: pageId,
        space: { workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      lifecycle: row.lifecycle,
      order: row.order,
      parentId: row.parentId,
      propertyValues: parseSchemaPropertyValues(row.propertyValues),
      spaceId: row.spaceId,
      title: row.title,
    }));
  }

  async listWorkspaceMemberIds(workspaceId: string): Promise<readonly string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      orderBy: { userId: 'asc' },
      select: { userId: true },
      where: { user: { isActive: true }, workspaceId },
    });
    return members.map((member) => member.userId);
  }

  private async loadSchemaSummary(
    client: Pick<Prisma.TransactionClient, 'pageSchemaProperty' | 'pageSchemaView'>,
    pageId: string,
  ): Promise<PageSchemaDefinition> {
    const [properties, views] = await Promise.all([
      client.pageSchemaProperty.findMany({
        orderBy: { order: 'asc' },
        select: schemaPropertySelection,
        where: { pageId },
      }),
      client.pageSchemaView.findMany({
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        select: schemaViewSelection,
        where: { pageId },
      }),
    ]);
    return {
      pageId,
      properties: properties.map(toPropertyDefinition),
      views: views.flatMap((view) => {
        const definition = toViewDefinition(view);
        return definition === null ? [] : [definition];
      }),
    };
  }
}
