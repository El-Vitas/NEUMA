import { isDeepStrictEqual } from 'node:util';
import { Injectable } from '@nestjs/common';
import type { JsonObject } from '@neuma/db';
import { DatabasePropertyType, FileAssetLifecycle, PageLifecycle } from '@neuma/db';
import type { PagePropertyOption, UserRole } from '@neuma/shared';
import {
  isPageTemplate,
  pickDefaultStatusOption,
  readPagePropertyConfig,
  readPagePropertyOptions,
  toValueList,
  withPageDerivedValues,
  writePagePropertyConfig,
} from '@neuma/shared';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../../common/domain/schema.domain.types';
import { propertyValueMentions, rewritePropertyValues } from '../../../../common/domain/schema-option.domain';
import {
  toSchemaPropertyDefinition,
  toSchemaViewDefinition,
} from '../../../../common/infrastructure/persistence/schema-json.adapter';
import { WorkspaceMemberRepository } from '../../../../common/infrastructure/persistence/workspace-member.repository';
import type { BlockWriteWithin } from '../../../../common/types/block-writer.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaModels } from '../../../../prisma/types/prisma.types';
import { TAB_RENAME_PREFIX } from '../../constants/page-view.constants';
import { SCHEMA_CHANGED_MEANWHILE, SCHEMA_OPTION_ALREADY_MOVED } from '../../constants/pages.constants';
import { readPageValues } from '../../domain/page.block.domain';
import { PageAccessDeniedError } from '../../domain/page.error';
import { buildValueRewriteOperations, diffPageValues } from '../../domain/page.operation.domain';
import type { PageSchemaSideEffects } from '../../domain/page-schema.domain.types';
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

/** The ids that the cells of these properties hold in the given rows, once each. */
const listCellIds = (rows: readonly StoredPageBlock[], keys: readonly string[]): string[] => [
  ...new Set(
    rows.flatMap((row) => {
      const values = readPageValues(row.properties);
      return keys.flatMap((key) => {
        const cell = values?.[key];
        return cell === undefined ? [] : toValueList(cell);
      });
    }),
  ),
];

/** What the shape says about a view: its tab. The configuration changes by operations and is not part of it. */
const toViewTab = (view: SchemaViewDefinition) => ({
  isDefault: view.isDefault,
  name: view.name,
  type: view.type,
});

const selectSchemaProperties = (properties: NeumaModels['PageSchemaProperty']) =>
  properties.select('config', 'key', 'label', 'options', 'required', 'type');

const toStoredOptions = (options: readonly PagePropertyOption[] | null) =>
  options === null
    ? null
    : options.map((option) => ({
        color: option.color,
        ...(option.group === null ? {} : { group: option.group }),
        id: option.id,
        value: option.value,
      }));

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

  async findCollectionIds(pageIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (pageIds.length === 0) return new Set();
    const properties = await this.prisma.models.PageSchemaProperty.select('pageId')
      .where((property) => property.pageId.in([...pageIds]))
      .all();
    return new Set(properties.map((property) => property.pageId));
  }

  async getSchema(pageId: string): Promise<PageSchemaDefinition> {
    return this.loadSchemaSummary(this.prisma.models, pageId);
  }

  async defineSchema(
    pageId: string,
    { properties, views }: PageSchemaShape,
    readShape: PageSchemaShape | undefined,
    sideEffects: PageSchemaSideEffects,
    writer: PageViewer,
  ): Promise<PageSchemaDefinition | typeof SCHEMA_CHANGED_MEANWHILE> {
    const publishes: (() => void)[] = [];
    const saved = await this.prisma.transaction(async (transaction) => {
      const within = { deferPublish: (publish: () => void) => publishes.push(publish), transaction };
      await transaction.query(
        this.prisma.sql`SELECT "id" FROM "Block" WHERE "id" = ${pageId} FOR UPDATE`
          .returnsRow({ id: this.prisma.tables.Block.columns.id })
          .build(),
      );
      if (readShape !== undefined && !(await this.isStillTheShape(transaction.orm.public, pageId, readShape)))
        return SCHEMA_CHANGED_MEANWHILE;
      const before = await transaction.orm.public.PageSchemaProperty.select('key', 'nextValue', 'type')
        .where({ pageId })
        .all();
      const shapeBefore = (await this.loadSchemaSummary(transaction.orm.public, pageId)).properties;
      const rowCount = (
        await transaction.orm.public.Block.select('id', 'properties').where({ parentId: pageId, type: 'page' }).all()
      ).filter((row) => !isPageTemplate(row.properties)).length;
      await transaction.orm.public.PageSchemaProperty.where({ pageId }).deleteAndCount();
      await transaction.orm.public.PageSchemaProperty.createAndCount(
        properties.map((property, order) => ({
          config: writePagePropertyConfig(property.type, property.config) as JsonObject | null,
          key: property.key,
          label: property.label,
          nextValue:
            before.find((entry) => entry.key === property.key)?.nextValue ??
            (property.type === DatabasePropertyType.UNIQUE_ID ? rowCount + 1 : 1),
          options: toStoredOptions(property.options),
          order,
          pageId,
          required: property.required,
          type: property.type,
        })),
      );
      await this.reconcileViews(transaction.orm.public, pageId, views);
      await this.applySideEffects(transaction.orm.public, pageId, sideEffects);
      const summary = await this.loadSchemaSummary(transaction.orm.public, pageId);
      const beforeKeys = new Set(before.map((entry) => entry.key));
      const added = summary.properties.filter((property) => !beforeKeys.has(property.key));
      await this.backfillNewProperties(pageId, added, writer, within);
      await this.clearRemovedOptions(pageId, shapeBefore, summary.properties, writer, within);
      return summary;
    });
    for (const publish of publishes) publish();
    return saved;
  }

  /** An option that left the shape leaves the rows too: a status row moves to its group's next option. */
  private async clearRemovedOptions(
    pageId: string,
    before: readonly SchemaPropertyDefinition[],
    after: readonly SchemaPropertyDefinition[],
    writer: PageViewer,
    within?: BlockWriteWithin,
  ): Promise<void> {
    for (const property of after) {
      const previous = before.find((candidate) => candidate.key === property.key && candidate.type === property.type);
      const kept = new Set((property.options ?? []).map((option) => option.id));
      for (const gone of (previous?.options ?? []).filter((option) => !kept.has(option.id))) {
        const replacement =
          property.type === DatabasePropertyType.STATUS
            ? ((property.options ?? []).find((option) => option.group === gone.group)?.id ?? null)
            : null;
        await this.clearOptionFromRows(
          pageId,
          property.key,
          { optionId: gone.id, replacementId: replacement },
          writer,
          within,
        );
      }
    }
  }

  /**
   * Renaming an option moves no row: rows hold the id. Removing one clears it from the rows first, in one block
   * transaction, then from the schema, so no row keeps an id the schema dropped. The option is re-checked under the
   * lock of its property: a concurrent edit to it must not be overwritten. Running it again after a failure finishes
   * the job.
   */
  async rewriteOption(
    pageId: string,
    propertyKey: string,
    change: { readonly optionId: string; readonly replacementId: null | string; readonly to: null | string },
    properties: readonly SchemaPropertyDefinition[],
    writer: PageViewer,
  ): Promise<PageSchemaDefinition | typeof SCHEMA_OPTION_ALREADY_MOVED> {
    const publishes: (() => void)[] = [];
    const rewrittenSchema = await this.prisma.transaction(async (transaction) => {
      const within = { deferPublish: (publish: () => void) => publishes.push(publish), transaction };
      const held = await transaction.query(
        this.prisma.sql`
        SELECT "options" FROM "PageSchemaProperty" WHERE "pageId" = ${pageId} AND "key" = ${propertyKey} FOR UPDATE
      `
          .returnsRow({ options: this.prisma.tables.PageSchemaProperty.columns.options })
          .build(),
      );
      const stillThere = readPagePropertyOptions(held[0]?.options)?.some((option) => option.id === change.optionId);
      if (stillThere !== true) return SCHEMA_OPTION_ALREADY_MOVED;
      if (change.to === null) await this.clearOptionFromRows(pageId, propertyKey, change, writer, within);
      const rewritten = properties.find((property) => property.key === propertyKey);
      await transaction.orm.public.PageSchemaProperty.where({ key: propertyKey, pageId }).updateAndCount({
        options: toStoredOptions(rewritten?.options ?? null),
      });
      return this.loadSchemaSummary(transaction.orm.public, pageId);
    });
    for (const publish of publishes) publish();
    return rewrittenSchema;
  }

  /**
   * The records of rows a query already chose, in the order given. The query left out what the reader may not open,
   * so this does not check access again; it only drops what is no longer an active row of the collection.
   */
  async readRowsById(
    pageId: string,
    rowIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageRowsPage> {
    const blocks = await this.blockReader.readPageBlocks(rowIds);
    const byId = new Map(blocks.map((block) => [block.id, block]));
    const rows = rowIds.flatMap((id) => {
      const block = byId.get(id);
      return block !== undefined && block.parentId === pageId && block.lifecycle === PageLifecycle.ACTIVE
        ? [block]
        : [];
    });
    const properties = await this.resolveSchemaProperties(pageId);
    const related = await this.readRelatedRows(rows, properties, { role, userId, workspaceId });
    return {
      attachedFiles: await this.readAttachedFiles(rows, properties, workspaceId),
      hasMore: false,
      relatedRows: related.rows,
      rows: rows.map((row, order) => ({
        createdAt: row.createdAt,
        createdById: row.createdById,
        editedAt: row.editedAt,
        editedById: row.editedById,
        id: row.id,
        lifecycle: row.lifecycle,
        order,
        parentId: row.parentId,
        propertyValues: this.toRowValues(row, properties, related.readableIds),
        spaceId: row.spaceId,
        title: readBlockTitle(row.properties),
      })),
    };
  }

  async listWorkspaceMemberIds(workspaceId: string): Promise<readonly string[]> {
    return this.workspaceMemberRepository.listActiveMemberIds(workspaceId);
  }

  async findAttachableFileIds(
    fileIds: readonly string[],
    scope: { readonly pageId: null | string; readonly userId: string; readonly workspaceId: string },
  ): Promise<ReadonlySet<string>> {
    if (fileIds.length === 0) return new Set();
    const assets = await this.prisma.models.FileAsset.select('id', 'ownerId', 'pageId')
      .where({ lifecycle: FileAssetLifecycle.ACTIVE, workspaceId: scope.workspaceId })
      .where((asset) => asset.id.in([...fileIds]))
      .all();
    return new Set(
      assets
        .filter((asset) => asset.ownerId === scope.userId || (scope.pageId !== null && asset.pageId === scope.pageId))
        .map((asset) => asset.id),
    );
  }

  async attachFilesToPage(pageId: string, fileIds: readonly string[]): Promise<void> {
    if (fileIds.length === 0) return;
    await this.prisma.models.FileAsset.where((asset) => asset.id.in([...fileIds]))
      .where({ pageId: null })
      .updateAndCount({ pageId });
  }

  /** What a row stores, without the relations to rows the reader cannot see, and with the data of its block. */
  private toRowValues(
    row: StoredPageBlock,
    properties: readonly SchemaPropertyDefinition[],
    readableIds: ReadonlySet<string>,
  ): SchemaPropertyValues | null {
    const stored = readPageValues(row.properties);
    if (stored === null) return null;
    const visible = Object.fromEntries(
      Object.entries(stored).map(([key, value]) => {
        const isRelation = properties.some(
          (property) => property.key === key && property.type === DatabasePropertyType.RELATION,
        );
        return [key, isRelation ? toValueList(value).filter((id) => readableIds.has(id)) : value];
      }),
    );
    return withPageDerivedValues(properties, visible, {
      createdAt: row.createdAt.toISOString(),
      createdById: row.createdById,
      editedAt: row.editedAt.toISOString(),
      editedById: row.editedById,
    });
  }

  /** The rows the cells of these rows point to, kept to the ones the reader may open, with their titles. */
  private async readRelatedRows(
    rows: readonly StoredPageBlock[],
    properties: readonly SchemaPropertyDefinition[],
    viewer: PageViewer,
  ): Promise<{ readableIds: ReadonlySet<string>; rows: readonly { id: string; title: string }[] }> {
    const relationKeys = properties
      .filter((property) => property.type === DatabasePropertyType.RELATION)
      .map((property) => property.key);
    const ids = listCellIds(rows, relationKeys);
    const targets = await this.blockReader.keepAccessible(await this.blockReader.readPageBlocks(ids), viewer);
    const open = targets.filter(({ access, block }) => !access.isInTrash && block.lifecycle === PageLifecycle.ACTIVE);
    return {
      readableIds: new Set(open.map(({ block }) => block.id)),
      rows: open.map(({ block }) => ({ id: block.id, title: readBlockTitle(block.properties) })),
    };
  }

  private async readAttachedFiles(
    rows: readonly StoredPageBlock[],
    properties: readonly SchemaPropertyDefinition[],
    workspaceId: string,
  ): Promise<PageRowsPage['attachedFiles']> {
    const fileKeys = properties
      .filter((property) => property.type === DatabasePropertyType.FILES)
      .map(({ key }) => key);
    const ids = listCellIds(rows, fileKeys);
    if (ids.length === 0) return [];
    const assets = await this.prisma.models.FileAsset.select('id', 'mimeType', 'originalFilename', 'size')
      .where({ lifecycle: FileAssetLifecycle.ACTIVE, workspaceId })
      .where((asset) => asset.id.in(ids))
      .all();
    return assets.map((asset) => ({
      id: asset.id,
      mimeType: asset.mimeType,
      name: asset.originalFilename,
      size: asset.size,
    }));
  }

  private async applySideEffects(
    models: NeumaModels,
    pageId: string,
    { mirrorsToCreate, mirrorsToUnlink }: PageSchemaSideEffects,
  ): Promise<void> {
    for (const mirror of mirrorsToCreate) {
      const siblings = await models.PageSchemaProperty.select('order')
        .where({ pageId: mirror.targetCollectionId })
        .all();
      const order = siblings.reduce((highest, sibling) => Math.max(highest, sibling.order), -1) + 1;
      await models.PageSchemaProperty.createAndCount([
        {
          config: { mirrorPropertyKey: mirror.mirrorOfKey, targetCollectionId: pageId },
          key: mirror.key,
          label: mirror.label,
          order,
          pageId: mirror.targetCollectionId,
          required: false,
          type: DatabasePropertyType.RELATION,
        },
      ]);
    }
    for (const unlink of mirrorsToUnlink) {
      const held = await models.PageSchemaProperty.select('config')
        .where({ key: unlink.key, pageId: unlink.collectionId })
        .first();
      if (held === null) continue;
      const config = readPagePropertyConfig(held.config);
      await models.PageSchemaProperty.where({ key: unlink.key, pageId: unlink.collectionId }).updateAndCount({
        config: writePagePropertyConfig(DatabasePropertyType.RELATION, {
          ...config,
          mirrorPropertyKey: null,
        }) as JsonObject | null,
      });
    }
  }

  /** The rows that already exist get what a new status or a new unique id gives every row. */
  private async backfillNewProperties(
    pageId: string,
    added: readonly SchemaPropertyDefinition[],
    writer: PageViewer,
    within: BlockWriteWithin,
  ): Promise<void> {
    const statuses = added.filter((property) => property.type === DatabasePropertyType.STATUS);
    const numbered = added.filter((property) => property.type === DatabasePropertyType.UNIQUE_ID);
    if (statuses.length === 0 && numbered.length === 0) return;
    const [collection] = await this.blockReader.readPageBlocks([pageId]);
    if (collection === undefined) return;
    const rows = (await this.blockReader.readPagesUnder([pageId])).toSorted(
      (first, second) => first.createdAt.getTime() - second.createdAt.getTime() || first.id.localeCompare(second.id),
    );
    const operations = rows.flatMap((row, index) => {
      const stored = readPageValues(row.properties) ?? {};
      const changes: Record<string, SchemaPropertyValues[string]> = {};
      for (const property of statuses) {
        const option = pickDefaultStatusOption(property.options ?? []);
        if (stored[property.key] === undefined && option !== null) changes[property.key] = option.id;
      }
      for (const property of numbered) {
        if (stored[property.key] === undefined) changes[property.key] = index + 1;
      }
      return buildValueRewriteOperations(row.id, changes);
    });
    if (operations.length === 0) return;
    const isApplied = await this.blockWriter.apply(writer, collection.spaceId, operations, undefined, within);
    if (!isApplied) throw new PageAccessDeniedError();
  }

  /** Each row that holds the option loses it, or moves to the replacement, in a single transaction for all of them. */
  private async clearOptionFromRows(
    pageId: string,
    propertyKey: string,
    change: { readonly optionId: string; readonly replacementId: null | string },
    writer: PageViewer,
    within?: BlockWriteWithin,
  ): Promise<void> {
    const [collection] = await this.blockReader.readPageBlocks([pageId]);
    if (collection === undefined) return;
    const rows = await this.blockReader.readPagesUnder([pageId], { includeTemplates: true });
    const operations = rows.flatMap((row) => {
      const stored = readPageValues(row.properties);
      if (stored === null || !propertyValueMentions(stored[propertyKey], change.optionId)) return [];
      const rewritten = rewritePropertyValues(stored, propertyKey, change.optionId, change.replacementId);
      return buildValueRewriteOperations(row.id, diffPageValues(stored, rewritten));
    });
    if (operations.length === 0) return;
    const isApplied = await this.blockWriter.apply(writer, collection.spaceId, operations, undefined, within);
    if (!isApplied) throw new PageAccessDeniedError();
  }

  /**
   * A view that already exists keeps its row, its configuration and its manual order: its configuration changes by
   * operations (ADR 025), and a shape saved from a stale screen must not write an old one back. Only the tab
   * (name, type, default, place) is taken from the shape. A view matches by id, or by name when it names no id.
   */
  private async reconcileViews(
    models: NeumaModels,
    pageId: string,
    views: readonly SchemaViewDefinition[],
  ): Promise<void> {
    const stored = await models.PageSchemaView.select('id', 'name').where({ pageId }).all();
    const storedIds = new Set(stored.map((view) => view.id));
    const idByName = new Map(stored.map((view) => [view.name, view.id]));
    const taken = new Set<string>();
    const matched = views.map((view) => {
      const byId = view.id !== undefined && storedIds.has(view.id) && !taken.has(view.id) ? view.id : null;
      const candidate = byId ?? idByName.get(view.name) ?? null;
      const id = candidate !== null && !taken.has(candidate) ? candidate : null;
      if (id !== null) taken.add(id);
      return { id, view };
    });
    const removedIds = stored.map((view) => view.id).filter((id) => !taken.has(id));
    if (removedIds.length > 0) {
      await models.PageSchemaView.where((view) => view.id.in(removedIds)).deleteAndCount();
    }
    for (const { id } of matched) {
      if (id !== null) await models.PageSchemaView.where({ id }).updateAndCount({ name: `${TAB_RENAME_PREFIX}${id}` });
    }
    for (const [order, { id, view }] of matched.entries()) {
      if (id === null) {
        await models.PageSchemaView.createAndCount([
          {
            configuration: view.configuration,
            isDefault: view.isDefault,
            name: view.name,
            order,
            pageId,
            type: view.type,
          },
        ]);
      } else {
        await models.PageSchemaView.where({ id }).updateAndCount({
          isDefault: view.isDefault,
          name: view.name,
          order,
          type: view.type,
        });
      }
    }
  }

  private async isStillTheShape(models: NeumaModels, pageId: string, readShape: PageSchemaShape): Promise<boolean> {
    const current = await this.loadSchemaSummary(models, pageId);
    return isDeepStrictEqual(
      { properties: current.properties, views: current.views.map(toViewTab) },
      { properties: readShape.properties, views: readShape.views.map(toViewTab) },
    );
  }

  private async loadSchemaSummary(models: NeumaModels, pageId: string): Promise<PageSchemaDefinition> {
    const [properties, views] = await Promise.all([
      selectSchemaProperties(models.PageSchemaProperty)
        .where({ pageId })
        .orderBy((property) => property.order.asc())
        .all(),
      // Ordered by the configured tab order, not by name, so renaming a view does not move it.
      models.PageSchemaView.select('configuration', 'id', 'isDefault', 'name', 'type', 'version')
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
