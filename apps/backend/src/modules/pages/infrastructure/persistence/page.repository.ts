import { isDeepStrictEqual } from 'node:util';
import { Injectable } from '@nestjs/common';
import { and, type JsonValue, type NeumaTransaction, PageLifecycle } from '@neuma/db';
import { type PageContent, type PageCoverValue, type PageIcon, Result, type UserRole } from '@neuma/shared';
import { placeBefore } from '../../../../common/domain/ordering.domain';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { toPageIconInput } from '../../../../common/infrastructure/persistence/page-icon.adapter';
import { parseSchemaPropertyValues } from '../../../../common/infrastructure/persistence/schema-json.adapter';
import {
  buildSpaceVisibilityFilter,
  findAccessibleSpaceId,
} from '../../../../common/infrastructure/persistence/space.visibility.filter';
import type { ModelFilterScope } from '../../../../common/types/model.filter.types';
import { requireRow } from '../../../../common/utils/required-row.utils';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaModels } from '../../../../prisma/types/prisma.types';
import { PAGE_CONTENT_STORE_OUTCOME, PAGE_MOVES_LOCK_PREFIX } from '../../constants/pages.constants';
import { collectDescendantIds, pageTitleMatchesSearch, validatePageContent } from '../../domain/page.domain';
import { validatePageCover } from '../../domain/page-cover.domain';
import type {
  CreatePageInput,
  DuplicatePageInput,
  PageAccessState,
  PageContentStoreOutcome,
  PageCopySource,
  PageDeleteForeverOutcome,
  PageHierarchyRow,
  PageMoveContext,
  PageMoveDestinations,
  PagePropertyValuesMerge,
  PageRepositoryContract,
  PageRestoreOutcome,
  PageSummary,
  StorePageContentInput,
  TrashedPageSummary,
  UpdatePagePropertyValuesInput,
} from '../../types/page.types';
import { PageStoredContentInvalidError } from '../errors/page.stored-content.error';

/** The editor schema types its optional fields loosely; the database stores only what survives serialization. */
const toStoredJson = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (Array.isArray(value)) return value.map(toStoredJson);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, toStoredJson(entry)]),
    );
  }
  throw new Error(`A ${typeof value} cannot be stored as JSON`);
};

const toCoverInput = (cover: PageCoverValue | null): JsonValue =>
  cover === null ? null : { assetId: cover.assetId, position: cover.position };

/** An unreadable stored cover yields null instead of failing the whole page. */
const parsePageCover = (cover: JsonValue): PageCoverValue | null => {
  const validation = validatePageCover(cover);
  return validation.isOk() ? validation.getValue() : null;
};

/** The write was meant for a row the caller had just read, so a missing one is a lost race, not a normal outcome. */
const requireWrittenPage = <Row>(row: Row | null, pageId: string): Row => requireRow(row, `Page ${pageId}`);

const summarizePages = (models: NeumaModels) =>
  models.Page.select(
    'content',
    'cover',
    'createdAt',
    'createdById',
    'icon',
    'id',
    'lifecycle',
    'lockedAt',
    'order',
    'ownerId',
    'parentId',
    'propertyValues',
    'spaceId',
    'title',
    'updatedAt',
    'updatedById',
    'verificationExpiresAt',
    'verifiedAt',
    'verifiedById',
  ).include('versions', (versions) =>
    versions
      .select('version')
      .orderBy((entry) => entry.version.desc())
      .limit(1),
  );

const selectPageCopy = (models: NeumaModels) =>
  models.Page.select('content', 'cover', 'icon', 'id', 'order', 'parentId', 'propertyValues', 'spaceId', 'title');

const selectPageHierarchy = (models: NeumaModels) =>
  models.Page.select('id', 'lifecycle', 'parentId', 'spaceId', 'title', 'trashedAt', 'updatedById');

/**
 * Concurrent creations can get the same number (next = highest + 1), so creation time
 * breaks the tie and the tree reads the same every time.
 */
const orderBySiblingPosition = () => [
  (page: ModelFilterScope<'Page'>) => page.order.asc(),
  (page: ModelFilterScope<'Page'>) => page.createdAt.asc(),
];

const lifecycleEventType = (lifecycle: PageLifecycle): string =>
  lifecycle === PageLifecycle.TRASHED ? 'PAGE_TRASHED' : 'PAGE_RESTORED';

@Injectable()
export class PageRepository implements PageRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async listAccessible(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    includeTrashed: boolean,
  ): Promise<readonly PageSummary[]> {
    const isAccessible = this.accessFilter(spaceId, workspaceId, userId, role);
    const pages = await summarizePages(this.prisma.models)
      .where((page) => and(isAccessible(page), ...(includeTrashed ? [] : [page.lifecycle.eq(PageLifecycle.ACTIVE)])))
      .orderBy([(page) => page.parentId.asc(), (page) => page.order.asc()])
      .all();
    const authors = await this.resolvePageAuthors(pages);
    return pages.map((page) => this.toSummary(page, authors));
  }

  async findAccessState(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageAccessState | null> {
    return this.prisma.models.Page.select('lifecycle', 'lockedAt')
      .where(this.pageAccessFilter(workspaceId, userId, role))
      .where({ id: pageId })
      .first();
  }

  async getAccessible(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    const page = await summarizePages(this.prisma.models)
      .where(this.pageAccessFilter(workspaceId, userId, role))
      .where({ id: pageId })
      .first();
    if (page === null) return null;
    const authors = await this.resolvePageAuthors([page]);
    return this.toSummary(page, authors);
  }

  async findReadablePageIds(
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly string[]> {
    if (pageIds.length === 0) return [];
    const pages = await this.prisma.models.Page.select('id')
      .where(this.pageAccessFilter(workspaceId, userId, role))
      .where((page) => page.id.in([...pageIds]))
      .where({ lifecycle: PageLifecycle.ACTIVE })
      .all();
    return pages.map((page) => page.id);
  }

  async create(input: CreatePageInput): Promise<PageSummary | null> {
    return this.prisma.transaction(async (transaction) => {
      const accessibleSpaceId = await findAccessibleSpaceId(
        transaction.orm.public,
        input.spaceId,
        input.workspaceId,
        input.userId,
        input.role,
      );
      if (accessibleSpaceId === null) return null;
      if (input.parentId !== null) {
        const parent = await transaction.orm.public.Page.select('id')
          .where({ id: input.parentId, lifecycle: PageLifecycle.ACTIVE, spaceId: input.spaceId })
          .first();
        if (parent === null) return null;
      }
      const order = await this.findNextOrder(transaction, input.spaceId, input.parentId);
      const content = toStoredJson(input.content);
      const page = await summarizePages(transaction.orm.public).create({
        content,
        createdById: input.createdById,
        parentId: input.parentId,
        order,
        propertyValues: input.propertyValues,
        spaceId: input.spaceId,
        title: input.title,
        updatedById: input.createdById,
        versions: (versions) =>
          versions.create({ content, createdById: input.createdById, title: input.title, version: 1 }),
      });
      await this.outboxRepository.create(
        {
          aggregateId: page.id,
          aggregateType: 'PAGE',
          eventType: 'PAGE_CREATED',
          idempotencyKey: `page:${page.id}:version:1`,
          payload: { pageId: page.id, spaceId: input.spaceId, version: 1 },
          payloadVersion: 1,
        },
        transaction,
      );
      const authors = await this.resolvePageAuthors([page]);
      return this.toSummary(page, authors);
    });
  }

  /** The copy goes right after the original; only its root is renamed. */
  async duplicate(input: DuplicatePageInput): Promise<PageSummary | null> {
    return this.prisma.transaction(async (transaction) => {
      const original = await summarizePages(transaction.orm.public)
        .where(this.pageAccessFilter(input.workspaceId, input.userId, input.role))
        .where({ id: input.pageId, lifecycle: PageLifecycle.ACTIVE })
        .first();
      if (original === null) return null;
      await this.shiftSiblingsAfter(transaction, original);
      const copy = await this.writeThePageCopy(
        transaction,
        original,
        input.title ?? original.title,
        original.parentId,
        original.order + 1,
        input.userId,
      );
      if (copy === null) return null;
      if (input.includeChildren) await this.copyTheBranchUnder(transaction, original, copy.id, input.userId);
      const authors = await this.resolvePageAuthors([copy]);
      return this.toSummary(copy, authors);
    });
  }

  async findStoredContent(pageId: string): Promise<PageContent | null> {
    const page = await this.prisma.models.Page.select('content').where({ id: pageId }).first();
    if (page === null) return null;
    const content = validatePageContent(page.content);
    if (content.isFail()) throw new PageStoredContentInvalidError(pageId, content.getError());
    return content.getValue();
  }

  /** Locks the row while comparing: concurrent saves cut no duplicate versions, unchanged content cuts none. */
  async storeContent(input: StorePageContentInput): Promise<PageContentStoreOutcome> {
    return this.prisma.transaction(async (transaction) => {
      const current = await transaction.orm.public.Page.select('content', 'title')
        .where({ id: input.pageId })
        .forUpdate()
        .first();
      if (current === null) return PAGE_CONTENT_STORE_OUTCOME.missing;
      if (isDeepStrictEqual(current.content, input.content)) return PAGE_CONTENT_STORE_OUTCOME.unchanged;
      const latest = await transaction.orm.public.PageVersion.select('version')
        .where({ pageId: input.pageId })
        .orderBy((entry) => entry.version.desc())
        .first();
      const nextVersion = (latest?.version ?? 0) + 1;
      const content = toStoredJson(input.content);
      const updated = await transaction.orm.public.Page.where({ id: input.pageId }).update({
        content,
        updatedById: input.updatedById,
      });
      requireWrittenPage(updated, input.pageId);
      await transaction.orm.public.PageVersion.create({
        content,
        createdById: input.updatedById,
        pageId: input.pageId,
        title: current.title,
        version: nextVersion,
      });
      await this.announceNewVersion(transaction, input.pageId, nextVersion);
      return PAGE_CONTENT_STORE_OUTCOME.stored;
    });
  }

  async updatePropertyValues<TError>(
    input: UpdatePagePropertyValuesInput,
    merge: PagePropertyValuesMerge<TError>,
  ): Promise<Result<PageSummary, TError> | null> {
    const updated = await this.prisma.transaction(async (transaction) => {
      const current = await transaction.orm.public.Page.select('propertyValues')
        .where({ id: input.pageId })
        .forUpdate()
        .first();
      if (current === null) return null;
      const merged = merge(parseSchemaPropertyValues(current.propertyValues));
      if (merged.isFail()) return { refusal: merged.getError() };
      const page = requireWrittenPage(
        await summarizePages(transaction.orm.public)
          .where({ id: input.pageId })
          .update({
            propertyValues: merged.getValue(),
            ...(input.title === undefined ? {} : { title: input.title }),
            updatedById: input.updatedById,
          }),
        input.pageId,
      );
      await this.announceThePageChanged(page, transaction);
      return { page };
    });
    if (updated === null) return null;
    if ('refusal' in updated) return Result.fail(updated.refusal);
    const authors = await this.resolvePageAuthors([updated.page]);
    return Result.ok(this.toSummary(updated.page, authors));
  }

  private async announceNewVersion(transaction: NeumaTransaction, pageId: string, version: number): Promise<void> {
    await this.outboxRepository.create(
      {
        aggregateId: pageId,
        aggregateType: 'PAGE',
        eventType: 'PAGE_UPDATED',
        idempotencyKey: `page:${pageId}:version:${String(version)}`,
        payload: { pageId, version },
        payloadVersion: 1,
      },
      transaction,
    );
  }

  /** Announces a change that cuts no version (title, icon); the search index stores both. */
  private async announceThePageChanged(
    page: { readonly id: string; readonly updatedAt: Date },
    transaction: NeumaTransaction,
  ): Promise<void> {
    await this.outboxRepository.create(
      {
        aggregateId: page.id,
        aggregateType: 'PAGE',
        eventType: 'PAGE_UPDATED',
        idempotencyKey: `page:${page.id}:changed:${page.updatedAt.toISOString()}`,
        payload: { pageId: page.id },
        payloadVersion: 1,
      },
      transaction,
    );
  }

  async rename(
    pageId: string,
    title: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    if (!(await this.isActiveAndAccessible(pageId, workspaceId, userId, role))) return null;
    return this.prisma.transaction(async (transaction) => {
      const page = requireWrittenPage(
        await summarizePages(transaction.orm.public).where({ id: pageId }).update({ title, updatedById: userId }),
        pageId,
      );
      await this.announceThePageChanged(page, transaction);
      const authors = await this.resolvePageAuthors([page]);
      return this.toSummary(page, authors);
    });
  }

  /** Cuts no version: locking does not edit content. */
  async setLocked(
    pageId: string,
    locked: boolean,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    if (!(await this.isActiveAndAccessible(pageId, workspaceId, userId, role))) return null;
    const page = requireWrittenPage(
      await summarizePages(this.prisma.models)
        .where({ id: pageId })
        .update(locked ? { lockedAt: new Date(), lockedById: userId } : { lockedAt: null, lockedById: null }),
      pageId,
    );
    const authors = await this.resolvePageAuthors([page]);
    return this.toSummary(page, authors);
  }

  /**
   * Verifying re-stamps every time, which also lets an expiration be extended. Unverifying clears all
   * three fields together. Announces the change because the search index filters by verification.
   */
  async setVerification(
    pageId: string,
    verified: boolean,
    expiresAt: Date | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    if (!(await this.isActiveAndAccessible(pageId, workspaceId, userId, role))) return null;
    return this.prisma.transaction(async (transaction) => {
      const page = requireWrittenPage(
        await summarizePages(transaction.orm.public)
          .where({ id: pageId })
          .update(
            verified
              ? { verificationExpiresAt: expiresAt, verifiedAt: new Date(), verifiedById: userId }
              : { verificationExpiresAt: null, verifiedAt: null, verifiedById: null },
          ),
        pageId,
      );
      await this.announceThePageChanged(page, transaction);
      const authors = await this.resolvePageAuthors([page]);
      return this.toSummary(page, authors);
    });
  }

  /** Cuts no version: assigning does not edit content. */
  async setOwner(
    pageId: string,
    ownerId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    if (!(await this.isActiveAndAccessible(pageId, workspaceId, userId, role))) return null;
    const page = requireWrittenPage(
      await summarizePages(this.prisma.models).where({ id: pageId }).update({ ownerId }),
      pageId,
    );
    const authors = await this.resolvePageAuthors([page]);
    return this.toSummary(page, authors);
  }

  async updateCover(
    pageId: string,
    cover: PageCoverValue | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    if (!(await this.isActiveAndAccessible(pageId, workspaceId, userId, role))) return null;
    const page = requireWrittenPage(
      await summarizePages(this.prisma.models)
        .where({ id: pageId })
        .update({ cover: toCoverInput(cover), updatedById: userId }),
      pageId,
    );
    const authors = await this.resolvePageAuthors([page]);
    return { ...this.toSummary(page, authors), cover };
  }

  async updateIcon(
    pageId: string,
    icon: PageIcon | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    if (!(await this.isActiveAndAccessible(pageId, workspaceId, userId, role))) return null;
    return this.prisma.transaction(async (transaction) => {
      const page = requireWrittenPage(
        await summarizePages(transaction.orm.public)
          .where({ id: pageId })
          .update({ icon: toPageIconInput(icon), updatedById: userId }),
        pageId,
      );
      await this.announceThePageChanged(page, transaction);
      const authors = await this.resolvePageAuthors([page]);
      return this.toSummary(page, authors);
    });
  }

  /** The destination tree loads only if the reader can see that space. */
  async findMoveContext(
    pageId: string,
    targetSpaceId: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageMoveContext | null> {
    const page = await this.prisma.models.Page.select('id', 'parentId', 'propertyValues', 'spaceId', 'title')
      .where(this.pageAccessFilter(workspaceId, userId, role))
      .where({ id: pageId })
      .first();
    if (page === null) return null;
    const destinationSpaceId =
      targetSpaceId === null || targetSpaceId === page.spaceId
        ? null
        : await findAccessibleSpaceId(this.prisma.models, targetSpaceId, workspaceId, userId, role);
    if (targetSpaceId !== null && targetSpaceId !== page.spaceId && destinationSpaceId === null) return null;
    const spaceIds = destinationSpaceId === null ? [page.spaceId] : [page.spaceId, destinationSpaceId];
    const pages = await this.prisma.models.Page.select('id', 'parentId', 'spaceId')
      .where((candidate) => candidate.spaceId.in(spaceIds))
      .orderBy(orderBySiblingPosition())
      .all();
    return {
      pageId: page.id,
      pages,
      propertyValues: parseSchemaPropertyValues(page.propertyValues),
      spaceId: page.spaceId,
      title: page.title,
    };
  }

  async listWithProperties(workspaceId: string, userId: string, role: UserRole): Promise<readonly PageSummary[]> {
    const isAccessible = this.pageAccessFilter(workspaceId, userId, role);
    const pages = await summarizePages(this.prisma.models)
      .where((page) =>
        and(
          isAccessible(page),
          page.lifecycle.eq(PageLifecycle.ACTIVE),
          page.parentId.isNotNull(),
          page.propertyValues.isNotNull(),
        ),
      )
      .orderBy((page) => page.updatedAt.desc())
      .all();
    const authors = await this.resolvePageAuthors(pages);
    return pages.map((page) => this.toSummary(page, authors));
  }

  async listMoveDestinations(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageMoveDestinations | null> {
    const page = await this.prisma.models.Page.select('id')
      .where(this.pageAccessFilter(workspaceId, userId, role))
      .where({ id: pageId })
      .first();
    if (page === null) return null;
    const isVisible = buildSpaceVisibilityFilter(userId, role);
    const spaces = await this.prisma.models.Space.select('id', 'name')
      .where((space) => and(isVisible(space), space.workspaceId.eq(workspaceId)))
      .orderBy((space) => space.name.asc())
      .all();
    const pages = await this.prisma.models.Page.select('id', 'parentId', 'spaceId', 'title')
      .where({ lifecycle: PageLifecycle.ACTIVE })
      .where((candidate) => candidate.spaceId.in(spaces.map((space) => space.id)))
      .orderBy((candidate) => candidate.title.asc())
      .all();
    const ownBranch = new Set([pageId, ...collectDescendantIds(pageId, pages)]);
    return {
      pages: pages
        .filter((candidate) => !ownBranch.has(candidate.id))
        .map(({ id, spaceId, title }) => ({ id, spaceId, title })),
      spaces,
    };
  }

  /** Changes order only, never parent or space. Siblings are renumbered from the top so no two share a position. */
  async reorderAmongSiblings(
    pageId: string,
    beforePageId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<readonly PageSummary[] | null> {
    return this.prisma.transaction(async (transaction) => {
      const page = await transaction.orm.public.Page.select('parentId', 'spaceId')
        .where(this.pageAccessFilter(workspaceId, userId, role))
        .where({ id: pageId })
        .first();
      if (page === null) return null;

      const sisters = await transaction.orm.public.Page.select('id')
        .where({ lifecycle: PageLifecycle.ACTIVE, parentId: page.parentId, spaceId: page.spaceId })
        .orderBy([(sister) => sister.order.asc(), (sister) => sister.createdAt.asc()])
        .all();
      const reordered = placeBefore(sisters, pageId, beforePageId);
      if (reordered === null) return null;

      for (const [position, sister] of reordered.entries()) {
        const updated = await transaction.orm.public.Page.where({ id: sister.id }).update({ order: position });
        requireWrittenPage(updated, sister.id);
      }
      const rows = await summarizePages(transaction.orm.public)
        .where({ parentId: page.parentId, spaceId: page.spaceId })
        .orderBy(orderBySiblingPosition())
        .all();
      const authors = await this.resolvePageAuthors(rows);
      return rows.map((row) => this.toSummary(row, authors));
    });
  }

  async move(
    pageId: string,
    parentId: null | string,
    targetSpaceId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ): Promise<PageSummary | null> {
    const movesLockKey = PAGE_MOVES_LOCK_PREFIX + workspaceId;
    return this.prisma.transaction(async (transaction) => {
      await transaction.execute(
        this.prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${movesLockKey}))::text`.affectedCount().build(),
      );
      const page = await transaction.orm.public.Page.select('id', 'spaceId')
        .where(this.pageAccessFilter(workspaceId, userId, role))
        .where({ id: pageId, lifecycle: PageLifecycle.ACTIVE })
        .first();
      if (page === null) return null;
      const destinationSpaceId = await findAccessibleSpaceId(
        transaction.orm.public,
        targetSpaceId,
        workspaceId,
        userId,
        role,
      );
      if (destinationSpaceId === null) return null;
      if (parentId !== null && !(await this.canHangUnder(transaction, pageId, parentId, destinationSpaceId)))
        return null;
      await this.carryBranchIntoSpace(transaction, pageId, page.spaceId, destinationSpaceId, mutationId);
      const order = await this.findNextOrder(transaction, destinationSpaceId, parentId, pageId);
      const moved = requireWrittenPage(
        await summarizePages(transaction.orm.public)
          .where({ id: pageId })
          .update({ order, parentId, spaceId: destinationSpaceId, updatedById: userId }),
        pageId,
      );
      await this.outboxRepository.create(
        {
          aggregateId: moved.id,
          aggregateType: 'PAGE',
          eventType: 'PAGE_MOVED',
          idempotencyKey: `page:${moved.id}:move:${mutationId}`,
          payload: { pageId: moved.id, parentId, spaceId: destinationSpaceId },
          payloadVersion: 1,
        },
        transaction,
      );
      const authors = await this.resolvePageAuthors([moved]);
      return this.toSummary(moved, authors);
    });
  }

  /** Runs with workspace moves serialized, so crossed moves cannot form a cycle. */
  private async canHangUnder(
    transaction: NeumaTransaction,
    pageId: string,
    parentId: string,
    spaceId: string,
  ): Promise<boolean> {
    const parent = await transaction.orm.public.Page.select('id')
      .where({ id: parentId, lifecycle: PageLifecycle.ACTIVE, spaceId })
      .first();
    if (parent === null) return false;
    const [ownBranch] = await transaction.query(
      this.prisma.sql`
      WITH RECURSIVE "above" AS (
        SELECT "id", "parentId" FROM "Page" WHERE "id" = ${parentId}
        UNION
        SELECT "page"."id", "page"."parentId" FROM "Page" AS "page" JOIN "above" ON "page"."id" = "above"."parentId"
      )
      SELECT "id" FROM "above" WHERE "id" = ${pageId} LIMIT 1
    `
        .returnsRow({ id: this.prisma.tables.Page.columns.id })
        .build(),
    );
    return ownBranch === undefined;
  }

  async parentBelongsToSpace(parentId: string, spaceId: string): Promise<boolean> {
    const parent = await this.prisma.models.Page.select('id').where({ id: parentId, spaceId }).first();
    return parent !== null;
  }

  async countDescendantsByLifecycle(
    pageId: string,
    lifecycle: PageLifecycle,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<null | number> {
    const page = await this.prisma.models.Page.select('id', 'spaceId')
      .where(this.pageAccessFilter(workspaceId, userId, role))
      .where({ id: pageId })
      .first();
    if (page === null) return null;
    const hierarchy = await this.fetchSpaceHierarchy(page.spaceId);
    return this.countDescendantsInHierarchy(pageId, hierarchy, lifecycle);
  }

  async trashCascade(
    pageId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ): Promise<boolean> {
    return this.prisma.transaction(async (transaction) => {
      const page = await transaction.orm.public.Page.select('id', 'lifecycle', 'spaceId')
        .where(this.pageAccessFilter(workspaceId, userId, role))
        .where({ id: pageId })
        .first();
      if (page === null || page.lifecycle === PageLifecycle.TRASHED) return false;
      const hierarchy = await this.fetchSpaceHierarchy(page.spaceId, transaction);
      const activeDescendantIds = this.filterDescendantsByLifecycle(pageId, hierarchy, PageLifecycle.ACTIVE);
      const trashedPageIds = [pageId, ...activeDescendantIds];
      await transaction.orm.public.Page.where((candidate) => candidate.id.in(trashedPageIds)).updateAndCount({
        lifecycle: PageLifecycle.TRASHED,
        trashedAt: new Date(),
        updatedById: userId,
      });
      await this.recordLifecycleEvents(transaction, trashedPageIds, PageLifecycle.TRASHED, mutationId, page.spaceId);
      return true;
    });
  }

  async restoreCascade(
    pageId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
    includeChildren: boolean,
  ): Promise<null | PageRestoreOutcome> {
    return this.prisma.transaction(async (transaction) => {
      const page = await transaction.orm.public.Page.select('id', 'lifecycle', 'parentId', 'spaceId')
        .where(this.pageAccessFilter(workspaceId, userId, role))
        .where({ id: pageId })
        .first();
      if (page?.lifecycle !== PageLifecycle.TRASHED) return null;
      const parent = await this.findParentInfo(transaction, page.parentId);
      const restoredToRoot = page.parentId !== null && parent?.lifecycle !== PageLifecycle.ACTIVE;
      const resolvedParentId = restoredToRoot ? null : page.parentId;
      const spaceName = restoredToRoot ? await this.findSpaceName(transaction, page.spaceId) : null;

      const hierarchy = await this.fetchSpaceHierarchy(page.spaceId, transaction);
      const trashedDescendantIds = includeChildren
        ? this.filterDescendantsByLifecycle(pageId, hierarchy, PageLifecycle.TRASHED)
        : [];

      const restored = await transaction.orm.public.Page.where({ id: pageId }).update({
        lifecycle: PageLifecycle.ACTIVE,
        parentId: resolvedParentId,
        trashedAt: null,
        updatedById: userId,
      });
      requireWrittenPage(restored, pageId);
      if (trashedDescendantIds.length > 0) {
        await transaction.orm.public.Page.where((candidate) =>
          candidate.id.in([...trashedDescendantIds]),
        ).updateAndCount({ lifecycle: PageLifecycle.ACTIVE, trashedAt: null, updatedById: userId });
      }
      await this.recordLifecycleEvents(
        transaction,
        [pageId, ...trashedDescendantIds],
        PageLifecycle.ACTIVE,
        mutationId,
        page.spaceId,
      );

      return {
        parentTitle: restoredToRoot ? null : (parent?.title ?? null),
        restoredChildCount: trashedDescendantIds.length,
        restoredToRoot,
        spaceName,
      };
    });
  }

  async listTrashed(
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
    search: null | string,
  ): Promise<readonly TrashedPageSummary[]> {
    const accessibleSpaceIds = await this.findAccessibleSpaceIds(workspaceId, userId, role, spaceId);
    if (accessibleSpaceIds.length === 0) return [];
    // Only trashed pages: descendants of a deleted page were trashed with it, so counting needs no other tree rows.
    const pages = await selectPageHierarchy(this.prisma.models)
      .where({ lifecycle: PageLifecycle.TRASHED })
      .where((page) => page.spaceId.in([...accessibleSpaceIds]))
      .all();
    const trashedPages = pages.filter((page) => this.isSearchedTrashedPage(page, search));
    if (trashedPages.length === 0) return [];
    const hierarchyBySpaceId = this.groupBySpaceId(pages);
    const deletedByUsers = await this.findUsersByIds(trashedPages.map((page) => page.updatedById));
    return trashedPages.map((page) => ({
      deletedAt: page.trashedAt,
      deletedBy: deletedByUsers.get(page.updatedById) ?? null,
      id: page.id,
      parentId: page.parentId,
      spaceId: page.spaceId,
      title: page.title,
      trashedChildCount: this.countDescendantsInHierarchy(
        page.id,
        hierarchyBySpaceId.get(page.spaceId) ?? [],
        PageLifecycle.TRASHED,
      ),
    }));
  }

  async deleteForever(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageDeleteForeverOutcome> {
    return this.prisma.transaction(async (transaction) => {
      const page = await transaction.orm.public.Page.select('id', 'lifecycle')
        .where(this.pageAccessFilter(workspaceId, userId, role))
        .where({ id: pageId })
        .first();
      if (page === null) return 'NOT_FOUND';
      if (page.lifecycle !== PageLifecycle.TRASHED) return 'NOT_TRASHED';
      requireWrittenPage(await transaction.orm.public.Page.where({ id: pageId }).delete(), pageId);
      return 'DELETED';
    });
  }

  async emptyTrash(
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
  ): Promise<readonly string[]> {
    const accessibleSpaceIds = await this.findAccessibleSpaceIds(workspaceId, userId, role, spaceId);
    if (accessibleSpaceIds.length === 0) return [];
    return this.deleteTrashedPagesIn(accessibleSpaceIds);
  }

  /** Re-checks the page is still trashed in the same statement, so a just-restored page survives. */
  private async deleteTrashedPagesIn(spaceIds: readonly string[]): Promise<readonly string[]> {
    const deleted = await this.prisma.models.Page.select('id')
      .where({ lifecycle: PageLifecycle.TRASHED })
      .where((page) => page.spaceId.in([...spaceIds]))
      .deleteAll();
    return deleted.map((page) => page.id);
  }

  private accessFilter(spaceId: string, workspaceId: string, userId: string, role: UserRole) {
    const isAccessible = this.pageAccessFilter(workspaceId, userId, role);
    return (page: ModelFilterScope<'Page'>) => and(isAccessible(page), page.spaceId.eq(spaceId));
  }

  /** Trashed pages are not editable, so a stale tab cannot rename or lock something already gone. */
  private async isActiveAndAccessible(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<boolean> {
    const page = await this.prisma.models.Page.select('id')
      .where(this.pageAccessFilter(workspaceId, userId, role))
      .where({ id: pageId, lifecycle: PageLifecycle.ACTIVE })
      .first();
    return page !== null;
  }

  private pageAccessFilter(workspaceId: string, userId: string, role: UserRole) {
    const isVisible = buildSpaceVisibilityFilter(userId, role);
    return (page: ModelFilterScope<'Page'>) =>
      page.space.some((space) => and(isVisible(space), space.workspaceId.eq(workspaceId)));
  }

  private async findNextOrder(
    transaction: NeumaTransaction,
    spaceId: string,
    parentId: null | string,
    excludedPageId?: string,
  ): Promise<number> {
    const sibling = await transaction.orm.public.Page.select('order')
      .where({ parentId, spaceId })
      .where((page) => and(...(excludedPageId === undefined ? [] : [page.id.neq(excludedPageId)])))
      .orderBy((page) => page.order.desc())
      .first();
    return (sibling?.order ?? -1) + 1;
  }

  private toSummary(
    page: {
      content: JsonValue;
      createdAt: Date;
      createdById: string;
      cover: JsonValue;
      icon: JsonValue;
      id: string;
      lifecycle: PageLifecycle;
      lockedAt: Date | null;
      order: number;
      ownerId: null | string;
      parentId: null | string;
      propertyValues: JsonValue;
      spaceId: string;
      title: string;
      updatedAt: Date;
      updatedById: string;
      verificationExpiresAt: Date | null;
      verifiedAt: Date | null;
      verifiedById: null | string;
      versions: readonly { version: number }[];
    },
    users: ReadonlyMap<string, { id: string; name: string }>,
  ): PageSummary {
    return {
      content: page.content,
      createdAt: page.createdAt,
      createdBy: users.get(page.createdById) ?? null,
      cover: parsePageCover(page.cover),
      icon: parseStoredPageIcon(page.icon),
      id: page.id,
      lifecycle: page.lifecycle,
      lockedAt: page.lockedAt,
      order: page.order,
      owner: page.ownerId === null ? null : (users.get(page.ownerId) ?? null),
      parentId: page.parentId,
      propertyValues: parseSchemaPropertyValues(page.propertyValues),
      spaceId: page.spaceId,
      title: page.title,
      updatedAt: page.updatedAt,
      updatedBy: users.get(page.updatedById) ?? null,
      verificationExpiresAt: page.verificationExpiresAt,
      verifiedAt: page.verifiedAt,
      verifiedBy: page.verifiedById === null ? null : (users.get(page.verifiedById) ?? null),
      version: page.versions[0]?.version ?? 0,
    };
  }

  private async fetchSpaceHierarchy(
    spaceId: string,
    transaction?: NeumaTransaction,
  ): Promise<readonly PageHierarchyRow[]> {
    return selectPageHierarchy(this.prisma.modelsFor(transaction)).where({ spaceId }).all();
  }

  private filterDescendantsByLifecycle(
    pageId: string,
    hierarchy: readonly PageHierarchyRow[],
    lifecycle: PageLifecycle,
  ): readonly string[] {
    const lifecycleById = new Map(hierarchy.map((entry) => [entry.id, entry.lifecycle]));
    return collectDescendantIds(pageId, hierarchy).filter(
      (descendantId) => lifecycleById.get(descendantId) === lifecycle,
    );
  }

  private countDescendantsInHierarchy(
    pageId: string,
    hierarchy: readonly PageHierarchyRow[],
    lifecycle: PageLifecycle,
  ): number {
    return this.filterDescendantsByLifecycle(pageId, hierarchy, lifecycle).length;
  }

  private async findParentInfo(
    transaction: NeumaTransaction,
    parentId: null | string,
  ): Promise<null | { lifecycle: PageLifecycle; title: string }> {
    if (parentId === null) return null;
    return transaction.orm.public.Page.select('lifecycle', 'title').where({ id: parentId }).first();
  }

  private async findSpaceName(transaction: NeumaTransaction, spaceId: string): Promise<null | string> {
    const space = await transaction.orm.public.Space.select('name').where({ id: spaceId }).first();
    return space?.name ?? null;
  }

  /** Bumps the position of every later sibling so the copy fits right after the original. */
  private async shiftSiblingsAfter(
    transaction: NeumaTransaction,
    original: { readonly order: number; readonly parentId: null | string; readonly spaceId: string },
  ): Promise<void> {
    const sameParent =
      original.parentId === null
        ? this.prisma.sql`"parentId" IS NULL`.returns('pg/bool@1')
        : this.prisma.sql`"parentId" = ${original.parentId}`.returns('pg/bool@1');
    await transaction.execute(
      this.prisma.sql`
        UPDATE "Page"
        SET "order" = "order" + 1, "updatedAt" = now()
        WHERE "order" > ${original.order} AND ${sameParent} AND "spaceId" = ${original.spaceId}
      `
        .affectedCount()
        .build(),
    );
  }

  /**
   * Descendants follow the moved page so a branch is never split across spaces. Each is announced as
   * moved because the search index stores its space. Last editor is untouched: the move is not an edit.
   */
  private async carryBranchIntoSpace(
    transaction: NeumaTransaction,
    pageId: string,
    sourceSpaceId: string,
    destinationSpaceId: string,
    mutationId: string,
  ): Promise<void> {
    if (sourceSpaceId === destinationSpaceId) return;
    const pages = await transaction.orm.public.Page.select('id', 'parentId', 'spaceId')
      .where({ spaceId: sourceSpaceId })
      .all();
    const descendantIds = collectDescendantIds(pageId, pages);
    if (descendantIds.length === 0) return;
    await transaction.orm.public.Page.where((page) => page.id.in([...descendantIds])).updateAndCount({
      spaceId: destinationSpaceId,
    });
    for (const descendantId of descendantIds) {
      await this.outboxRepository.create(
        {
          aggregateId: descendantId,
          aggregateType: 'PAGE',
          eventType: 'PAGE_MOVED',
          idempotencyKey: `page:${descendantId}:move:${mutationId}`,
          payload: { pageId: descendantId, spaceId: destinationSpaceId },
          payloadVersion: 1,
        },
        transaction,
      );
    }
  }

  private async writeThePageCopy(
    transaction: NeumaTransaction,
    original: PageCopySource,
    title: string,
    parentId: null | string,
    order: number,
    userId: string,
  ) {
    const content = validatePageContent(original.content);
    if (content.isFail()) return null;
    const storedContent = toStoredJson(content.getValue());
    const copy = await summarizePages(transaction.orm.public).create({
      content: storedContent,
      cover: toCoverInput(parsePageCover(original.cover)),
      createdById: userId,
      icon: toPageIconInput(parseStoredPageIcon(original.icon)),
      order,
      parentId,
      propertyValues: parseSchemaPropertyValues(original.propertyValues),
      spaceId: original.spaceId,
      title,
      updatedById: userId,
      versions: (versions) => versions.create({ content: storedContent, createdById: userId, title, version: 1 }),
    });
    await this.outboxRepository.create(
      {
        aggregateId: copy.id,
        aggregateType: 'PAGE',
        eventType: 'PAGE_CREATED',
        idempotencyKey: `page:${copy.id}:version:1`,
        payload: { pageId: copy.id, spaceId: original.spaceId, version: 1 },
        payloadVersion: 1,
      },
      transaction,
    );
    return copy;
  }

  /** Walks top-down so each child finds its new parent already written. */
  private async copyTheBranchUnder(
    transaction: NeumaTransaction,
    original: { id: string; spaceId: string },
    copyId: string,
    userId: string,
  ): Promise<void> {
    const pages = await selectPageCopy(transaction.orm.public)
      .where({ lifecycle: PageLifecycle.ACTIVE, spaceId: original.spaceId })
      .orderBy(orderBySiblingPosition())
      .all();
    const copyIdByOriginalId = new Map<string, string>([[original.id, copyId]]);
    let generation = [original.id];
    while (generation.length > 0) {
      const nextGeneration: string[] = [];
      for (const parentOriginalId of generation) {
        const parentCopyId = copyIdByOriginalId.get(parentOriginalId);
        if (parentCopyId === undefined) continue;
        for (const child of pages.filter((page) => page.parentId === parentOriginalId)) {
          const childCopy = await this.writeThePageCopy(
            transaction,
            child,
            child.title,
            parentCopyId,
            child.order,
            userId,
          );
          if (childCopy === null) continue;
          copyIdByOriginalId.set(child.id, childCopy.id);
          nextGeneration.push(child.id);
        }
      }
      generation = nextGeneration;
    }
  }

  private async recordLifecycleEvents(
    transaction: NeumaTransaction,
    pageIds: readonly string[],
    lifecycle: PageLifecycle,
    mutationId: string,
    spaceId: string,
  ): Promise<void> {
    for (const pageId of pageIds) {
      await this.outboxRepository.create(
        {
          aggregateId: pageId,
          aggregateType: 'PAGE',
          eventType: lifecycleEventType(lifecycle),
          idempotencyKey: `page:${pageId}:${lifecycle}:${mutationId}`,
          payload: { lifecycle, pageId, spaceId },
          payloadVersion: 1,
        },
        transaction,
      );
    }
  }

  private async findAccessibleSpaceIds(
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
  ): Promise<readonly string[]> {
    const isVisible = buildSpaceVisibilityFilter(userId, role);
    const spaces = await this.prisma.models.Space.select('id')
      .where((space) =>
        and(space.workspaceId.eq(workspaceId), isVisible(space), ...(spaceId === null ? [] : [space.id.eq(spaceId)])),
      )
      .all();
    return spaces.map((space) => space.id);
  }

  private async resolvePageAuthors(
    pages: readonly {
      createdById: string;
      ownerId?: null | string;
      updatedById: string;
      verifiedById?: null | string;
    }[],
  ): Promise<ReadonlyMap<string, { id: string; name: string }>> {
    return this.findUsersByIds(
      pages.flatMap((page) =>
        [page.createdById, page.updatedById, page.ownerId, page.verifiedById].filter(
          (userId): userId is string => userId !== null && userId !== undefined,
        ),
      ),
    );
  }

  private async findUsersByIds(userIds: readonly string[]): Promise<ReadonlyMap<string, { id: string; name: string }>> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) return new Map();
    const users = await this.prisma.models.User.select('id', 'name')
      .where((user) => user.id.in(uniqueUserIds))
      .all();
    return new Map(users.map((user) => [user.id, user]));
  }

  private groupBySpaceId(pages: readonly PageHierarchyRow[]): ReadonlyMap<string, readonly PageHierarchyRow[]> {
    return pages.reduce<Map<string, PageHierarchyRow[]>>((accumulator, page) => {
      const siblings = accumulator.get(page.spaceId) ?? [];
      siblings.push(page);
      accumulator.set(page.spaceId, siblings);
      return accumulator;
    }, new Map());
  }

  private isSearchedTrashedPage(
    page: PageHierarchyRow,
    search: null | string,
  ): page is PageHierarchyRow & {
    trashedAt: Date;
  } {
    return (
      page.lifecycle === PageLifecycle.TRASHED && page.trashedAt !== null && pageTitleMatchesSearch(page.title, search)
    );
  }
}
