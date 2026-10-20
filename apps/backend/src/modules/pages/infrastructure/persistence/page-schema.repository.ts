import { isDeepStrictEqual } from 'node:util';
import { Injectable } from '@nestjs/common';
import type { JsonObject } from '@neuma/db';
import { DatabasePropertyType, PageLifecycle } from '@neuma/db';
import type { UserRole } from '@neuma/shared';
import { readPagePropertyOptionValues } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { propertyValueMentions, rewritePropertyValues } from '../../../../common/domain/schema-option.domain';
import {
  toSchemaPropertyDefinition,
  toSchemaViewDefinition,
} from '../../../../common/infrastructure/persistence/schema-json.adapter';
import { WorkspaceMemberRepository } from '../../../../common/infrastructure/persistence/workspace-member.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaModels } from '../../../../prisma/types/prisma.types';
import { SCHEMA_CHANGED_MEANWHILE, SCHEMA_OPTION_ALREADY_MOVED } from '../../constants/pages.constants';
import { readPageTitle, readPageValues } from '../../domain/page.block.domain';
import { PageAccessDeniedError } from '../../domain/page.error';
import { buildValueRewriteOperations, diffPageValues } from '../../domain/page.operation.domain';
import type { PageViewer } from '../../types/page.block.types';
import type { StoredPageBlock } from '../../types/page.types';
import type {
  PageRowsPage,
  PageSchemaDefinition,
  PageSchemaRepositoryContract,
  PageSchemaShape,
} from '../../types/page-schema.types';
import { PageBlockReader } from './page.block.reader';
import { PageBlockWriter } from './page.block.writer';

const selectSchemaProperties = (properties: NeumaModels['PageSchemaProperty']) =>
  properties.select('key', 'label', 'options', 'required', 'type');

@Injectable()
export class PageSchemaRepository implements PageSchemaRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
    private readonly blockReader: PageBlockReader,
    private readonly blockWriter: PageBlockWriter,
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
        this.prisma.sql`SELECT "id" FROM "Block" WHERE "id" = ${pageId} FOR UPDATE`
          .returnsRow({ id: this.prisma.tables.Block.columns.id })
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
   * The schema and the values of its rows change together: the rows first, in one block transaction, then the
   * schema, so no row keeps an option name the schema dropped. The source option is re-checked under the lock of its
   * property: a concurrent edit to it must not be overwritten. Running it again after a failure finishes the job.
   */
  async rewriteOption(
    pageId: string,
    propertyKey: string,
    rename: { readonly from: string; readonly to: null | string },
    properties: readonly SchemaPropertyDefinition[],
    writer: PageViewer,
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
      await this.rewriteRowValues(pageId, propertyKey, rename, writer);
      const rewritten = properties.find((property) => property.key === propertyKey);
      await transaction.orm.public.PageSchemaProperty.where({ key: propertyKey, pageId }).updateAndCount({
        options:
          rewritten?.options === null || rewritten?.options === undefined
            ? null
            : rewritten.options.map((option) => ({ color: option.color, value: option.value })),
      });
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

  /** The rows of a collection are the pages it holds, in the order it lists them. */
  async listRows(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    limit: number,
  ): Promise<PageRowsPage> {
    const [collection] = await this.blockReader.readPageBlocks([pageId]);
    const positions = new Map((collection?.children ?? []).map((id, position) => [id, position]));
    const positionOf = (row: StoredPageBlock): number => positions.get(row.id) ?? positions.size;
    const held = await this.blockReader.readPagesUnder([pageId]);
    const accessible = await this.blockReader.keepAccessible(held, { role, userId, workspaceId });
    const ordered = accessible
      .filter(({ access, block }) => !access.isInTrash && block.lifecycle === PageLifecycle.ACTIVE)
      .map(({ block }) => block)
      .toSorted((first, second) => positionOf(first) - positionOf(second));
    // One extra row tells a collection that fits exactly from one that was truncated.
    return {
      hasMore: ordered.length > limit,
      rows: ordered.slice(0, limit).map((row) => ({
        id: row.id,
        lifecycle: row.lifecycle,
        order: positionOf(row),
        parentId: row.parentId,
        propertyValues: readPageValues(row.properties),
        spaceId: row.spaceId,
        title: readPageTitle(row.properties),
      })),
    };
  }

  async listWorkspaceMemberIds(workspaceId: string): Promise<readonly string[]> {
    return this.workspaceMemberRepository.listActiveMemberIds(workspaceId);
  }

  /** Each row that holds the option gets the new one, or loses it, in a single transaction for all of them. */
  private async rewriteRowValues(
    pageId: string,
    propertyKey: string,
    rename: { readonly from: string; readonly to: null | string },
    writer: PageViewer,
  ): Promise<void> {
    const [collection] = await this.blockReader.readPageBlocks([pageId]);
    if (collection === undefined) return;
    const rows = await this.blockReader.readPagesUnder([pageId]);
    const operations = rows.flatMap((row) => {
      const stored = readPageValues(row.properties);
      if (stored === null || !propertyValueMentions(stored[propertyKey], rename.from)) return [];
      const rewritten = rewritePropertyValues(stored, propertyKey, rename.from, rename.to);
      return buildValueRewriteOperations(row.id, diffPageValues(stored, rewritten));
    });
    if (operations.length === 0) return;
    const isApplied = await this.blockWriter.apply(writer, collection.spaceId, operations);
    if (!isApplied) throw new PageAccessDeniedError();
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
