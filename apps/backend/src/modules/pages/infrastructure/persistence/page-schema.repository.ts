import { isDeepStrictEqual } from 'node:util';
import { Injectable } from '@nestjs/common';
import type { JsonObject } from '@neuma/db';
import { and, DatabasePropertyType, PageLifecycle } from '@neuma/db';
import type { UserRole } from '@neuma/shared';
import { readPagePropertyOptionValues } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { propertyValueMentions, rewritePropertyValues } from '../../../../common/domain/schema-option.domain';
import {
  parseSchemaPropertyValues,
  toSchemaPropertyDefinition,
  toSchemaViewDefinition,
} from '../../../../common/infrastructure/persistence/schema-json.adapter';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { WorkspaceMemberRepository } from '../../../../common/infrastructure/persistence/workspace-member.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaModels } from '../../../../prisma/types/prisma.types';
import { SCHEMA_CHANGED_MEANWHILE, SCHEMA_OPTION_ALREADY_MOVED } from '../../constants/pages.constants';
import type {
  PageRowsPage,
  PageSchemaDefinition,
  PageSchemaRepositoryContract,
  PageSchemaShape,
} from '../../types/page-schema.types';

const selectSchemaProperties = (properties: NeumaModels['PageSchemaProperty']) =>
  properties.select('key', 'label', 'options', 'required', 'type');

@Injectable()
export class PageSchemaRepository implements PageSchemaRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  async resolveSchemaProperties(pageId: null | string): Promise<readonly SchemaPropertyDefinition[]> {
    if (pageId === null) return [];
    const properties = await selectSchemaProperties(this.prisma.models.PageSchemaProperty)
      .where({ pageId })
      .orderBy((property) => property.order.asc())
      .all();
    return properties.map(toSchemaPropertyDefinition);
  }

  async listPersonPropertyKeys(pageIds: readonly string[]): Promise<ReadonlyMap<string, readonly string[]>> {
    if (pageIds.length === 0) return new Map();
    const properties = await this.prisma.models.PageSchemaProperty.select('key', 'pageId')
      .where({ type: DatabasePropertyType.PERSON })
      .where((property) => property.pageId.in([...pageIds]))
      .orderBy((property) => property.order.asc())
      .all();
    const keysByPage = new Map<string, string[]>();
    for (const property of properties)
      keysByPage.set(property.pageId, [...(keysByPage.get(property.pageId) ?? []), property.key]);
    return keysByPage;
  }

  async getSchema(pageId: string): Promise<PageSchemaDefinition> {
    return this.loadSchemaSummary(this.prisma.models, pageId);
  }

  async defineSchema(
    pageId: string,
    { properties, views }: PageSchemaShape,
    readShape?: PageSchemaShape,
  ): Promise<PageSchemaDefinition | typeof SCHEMA_CHANGED_MEANWHILE> {
    return this.prisma.transaction(async (transaction) => {
      await transaction.query(
        this.prisma.sql`SELECT "id" FROM "Page" WHERE "id" = ${pageId} FOR UPDATE`
          .returnsRow({ id: this.prisma.tables.Page.columns.id })
          .build(),
      );
      if (readShape !== undefined && !(await this.isStillTheShape(transaction.orm.public, pageId, readShape)))
        return SCHEMA_CHANGED_MEANWHILE;
      await transaction.orm.public.PageSchemaProperty.where({ pageId }).deleteAndCount();
      await transaction.orm.public.PageSchemaView.where({ pageId }).deleteAndCount();
      await transaction.orm.public.PageSchemaProperty.createAndCount(
        properties.map((property, order) => ({
          key: property.key,
          label: property.label,
          options:
            property.options === null
              ? null
              : property.options.map((option) => ({ color: option.color, value: option.value })),
          order,
          pageId,
          required: property.required,
          type: property.type,
        })),
      );
      await transaction.orm.public.PageSchemaView.createAndCount(
        views.map((view, order) => ({
          configuration: view.configuration,
          isDefault: view.isDefault,
          name: view.name,
          order,
          pageId,
          type: view.type,
        })),
      );
      return this.loadSchemaSummary(transaction.orm.public, pageId);
    });
  }

  /**
   * Schema and row values change in one transaction so no row keeps an option name the schema dropped.
   * The source option is re-checked under the row lock: a concurrent edit to it must not be overwritten.
   */
  async rewriteOption(
    pageId: string,
    propertyKey: string,
    rename: { readonly from: string; readonly to: null | string },
    properties: readonly SchemaPropertyDefinition[],
  ): Promise<PageSchemaDefinition | typeof SCHEMA_OPTION_ALREADY_MOVED> {
    return this.prisma.transaction(async (transaction) => {
      const held = await transaction.query(
        this.prisma.sql`
        SELECT "options" FROM "PageSchemaProperty" WHERE "pageId" = ${pageId} AND "key" = ${propertyKey} FOR UPDATE
      `
          .returnsRow({ options: this.prisma.tables.PageSchemaProperty.columns.options })
          .build(),
      );
      const stillThere = readPagePropertyOptionValues(held[0]?.options)?.includes(rename.from) ?? false;
      if (!stillThere) return SCHEMA_OPTION_ALREADY_MOVED;
      const rewritten = properties.find((property) => property.key === propertyKey);
      await transaction.orm.public.PageSchemaProperty.where({ key: propertyKey, pageId }).updateAndCount({
        options:
          rewritten?.options === null || rewritten?.options === undefined
            ? null
            : rewritten.options.map((option) => ({ color: option.color, value: option.value })),
      });
      const page = this.prisma.tables.Page;
      // Rows are locked so a card moved meanwhile does not return to its old column.
      const rows = await transaction.query(
        this.prisma.sql`
        SELECT "id", "propertyValues" FROM "Page"
        WHERE "parentId" = ${pageId} AND "propertyValues" IS NOT NULL
        FOR UPDATE
      `
          .returnsRow({ id: page.columns.id, propertyValues: page.columns.propertyValues })
          .build(),
      );
      for (const row of rows) {
        const stored = parseSchemaPropertyValues(row.propertyValues);
        if (stored === null || !propertyValueMentions(stored[propertyKey], rename.from)) continue;
        const updated = await transaction.orm.public.Page.where({ id: row.id }).update({
          propertyValues: rewritePropertyValues(stored, propertyKey, rename.from, rename.to),
        });
        if (updated === null) throw new Error(`Page ${row.id} vanished while its option was rewritten`);
      }
      return this.loadSchemaSummary(transaction.orm.public, pageId);
    });
  }

  /** Updates one view only; redefining the whole schema would recreate everything and risk losing concurrent edits. */
  async setViewConfiguration(
    pageId: string,
    viewName: string,
    configuration: JsonObject,
  ): Promise<PageSchemaDefinition> {
    await this.prisma.models.PageSchemaView.where({ name: viewName, pageId }).updateAndCount({ configuration });
    return this.loadSchemaSummary(this.prisma.models, pageId);
  }

  async listRows(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    limit: number,
  ): Promise<PageRowsPage> {
    const isVisibleSpace = buildSpaceVisibilityFilter(userId, role);
    // One extra row tells a collection that fits exactly from one that was truncated.
    const found = await this.prisma.models.Page.select(
      'id',
      'lifecycle',
      'order',
      'parentId',
      'propertyValues',
      'spaceId',
      'title',
    )
      .where({ lifecycle: PageLifecycle.ACTIVE, parentId: pageId })
      .where((page) => page.space.some((space) => and(space.workspaceId.eq(workspaceId), isVisibleSpace(space))))
      .orderBy((page) => page.order.asc())
      .limit(limit + 1)
      .all();
    return {
      hasMore: found.length > limit,
      rows: found.slice(0, limit).map((row) => ({
        id: row.id,
        lifecycle: row.lifecycle,
        order: row.order,
        parentId: row.parentId,
        propertyValues: parseSchemaPropertyValues(row.propertyValues),
        spaceId: row.spaceId,
        title: row.title,
      })),
    };
  }

  async listWorkspaceMemberIds(workspaceId: string): Promise<readonly string[]> {
    return this.workspaceMemberRepository.listActiveMemberIds(workspaceId);
  }

  private async isStillTheShape(models: NeumaModels, pageId: string, readShape: PageSchemaShape): Promise<boolean> {
    const current = await this.loadSchemaSummary(models, pageId);
    return isDeepStrictEqual(
      { properties: current.properties, views: current.views },
      { properties: readShape.properties, views: readShape.views },
    );
  }

  private async loadSchemaSummary(models: NeumaModels, pageId: string): Promise<PageSchemaDefinition> {
    const [properties, views] = await Promise.all([
      selectSchemaProperties(models.PageSchemaProperty)
        .where({ pageId })
        .orderBy((property) => property.order.asc())
        .all(),
      // Ordered by the configured tab order, not by name, so renaming a view does not move it.
      models.PageSchemaView.select('configuration', 'isDefault', 'name', 'type')
        .where({ pageId })
        .orderBy((view) => view.order.asc())
        .all(),
    ]);
    return {
      pageId,
      properties: properties.map(toSchemaPropertyDefinition),
      views: views.flatMap((view) => {
        const definition = toSchemaViewDefinition(view);
        return definition === null ? [] : [definition];
      }),
    };
  }
}
