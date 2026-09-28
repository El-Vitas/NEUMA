import { isDeepStrictEqual } from 'node:util';
import { PageLifecycle } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import { type PageContent, type PageCoverValue, type PageIcon, Result, type UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { placeBefore } from '../../../../common/domain/ordering.domain';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { parseSchemaPropertyValues } from '../../../../common/infrastructure/persistence/schema-json.adapter';
import {
  buildSpaceVisibilityFilter,
  findAccessibleSpaceId,
} from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PAGE_CONTENT_STORE_OUTCOME, PAGE_SIBLING_ORDER } from '../../constants/pages.constants';
import { collectDescendantIds, pageTitleMatchesSearch, validatePageContent } from '../../domain/page.domain';
import { validatePageCover } from '../../domain/page-cover.domain';
import type {
  CreatePageInput,
  DuplicatePageInput,
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
  StoredPageContentRow,
  StoredPagePropertyValuesRow,
  StorePageContentInput,
  TrashedPageSummary,
  UpdatePagePropertyValuesInput,
} from '../../types/page.types';

const toPropertyValuesInput = (
  propertyValues: CreatePageInput['propertyValues'],
): Prisma.InputJsonValue | typeof Prisma.JsonNull => propertyValues ?? Prisma.JsonNull;

const toIconInput = (icon: PageIcon | null): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  if (icon === null) return Prisma.JsonNull;
  switch (icon.kind) {
    case 'emoji':
      return { kind: icon.kind, value: icon.value };
    case 'image':
      return { assetId: icon.assetId, kind: icon.kind };
    default:
      return { color: icon.color, kind: icon.kind, name: icon.name };
  }
};

const toCoverInput = (cover: PageCoverValue | null): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  cover === null ? Prisma.JsonNull : { assetId: cover.assetId, position: cover.position };

/** A stored cover nobody can read leaves the page bare rather than unreadable. */
const parsePageCover = (cover: Prisma.JsonValue): PageCoverValue | null => {
  const validation = validatePageCover(cover);
  return validation.isOk() ? validation.getValue() : null;
};

const pageSelection = {
  content: true,
  cover: true,
  createdAt: true,
  createdById: true,
  icon: true,
  id: true,
  lifecycle: true,
  lockedAt: true,
  order: true,
  ownerId: true,
  parentId: true,
  propertyValues: true,
  spaceId: true,
  title: true,
  updatedAt: true,
  updatedById: true,
  verificationExpiresAt: true,
  verifiedAt: true,
  verifiedById: true,
  versions: { orderBy: { version: 'desc' as const }, select: { version: true }, take: 1 },
} satisfies Prisma.PageSelect;

const pageCopySelection = {
  content: true,
  cover: true,
  icon: true,
  id: true,
  order: true,
  parentId: true,
  propertyValues: true,
  spaceId: true,
  title: true,
} satisfies Prisma.PageSelect;

const pageHierarchySelection = {
  id: true,
  lifecycle: true,
  parentId: true,
  spaceId: true,
  title: true,
  trashedAt: true,
  updatedById: true,
} satisfies Prisma.PageSelect;

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
    const lifecycleFilter = includeTrashed ? {} : { lifecycle: PageLifecycle.ACTIVE };
    const pages = await this.prisma.page.findMany({
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
      select: pageSelection,
      where: { ...lifecycleFilter, ...this.accessFilter(spaceId, workspaceId, userId, role) },
    });
    const authors = await this.resolvePageAuthors(pages);
    return pages.map((page) => this.toSummary(page, authors));
  }

  async getAccessible(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    const page = await this.prisma.page.findFirst({
      select: pageSelection,
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
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
    const pages = await this.prisma.page.findMany({
      select: { id: true },
      where: {
        ...this.pageAccessFilter(workspaceId, userId, role),
        id: { in: [...pageIds] },
        lifecycle: PageLifecycle.ACTIVE,
      },
    });
    return pages.map((page) => page.id);
  }

  async create(input: CreatePageInput): Promise<PageSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const accessibleSpaceId = await findAccessibleSpaceId(
        transaction,
        input.spaceId,
        input.workspaceId,
        input.userId,
        input.role,
      );
      if (accessibleSpaceId === null) return null;
      if (input.parentId !== null) {
        const parent = await transaction.page.findFirst({
          select: { id: true },
          where: { id: input.parentId, spaceId: input.spaceId },
        });
        if (parent === null) return null;
      }
      const order = await this.findNextOrder(transaction, input.spaceId, input.parentId);
      const page = await transaction.page.create({
        data: {
          content: input.content,
          createdById: input.createdById,
          parentId: input.parentId,
          order,
          propertyValues: toPropertyValuesInput(input.propertyValues),
          spaceId: input.spaceId,
          title: input.title,
          updatedById: input.createdById,
          versions: {
            create: { content: input.content, createdById: input.createdById, title: input.title, version: 1 },
          },
        },
        select: pageSelection,
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

  /**
   * Copies a page, and what hangs from it when asked.
   *
   * The copy is put right after the original rather than at the end: a copy one
   * cannot find next to what it was copied from is a copy one has to go looking
   * for. Its branch keeps its own shape, and only the page one asked to copy is
   * renamed — the pages under it were not the ones being duplicated.
   */
  async duplicate(input: DuplicatePageInput): Promise<PageSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const original = await transaction.page.findFirst({
        select: pageSelection,
        where: { ...this.pageAccessFilter(input.workspaceId, input.userId, input.role), id: input.pageId },
      });
      if (original === null) return null;
      await transaction.page.updateMany({
        data: { order: { increment: 1 } },
        where: { order: { gt: original.order }, parentId: original.parentId, spaceId: original.spaceId },
      });
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
    const page = await this.prisma.page.findUnique({ select: { content: true }, where: { id: pageId } });
    if (page === null) return null;
    const content = validatePageContent(page.content);
    if (content.isFail()) throw new Error(`stored-page-content-is-invalid:${pageId}`);
    return content.getValue();
  }

  /**
   * Guarda lo que dice el documento colaborativo de una página. La fila queda
   * bloqueada mientras se compara, así dos guardados seguidos no cortan dos
   * versiones del mismo texto, y lo que no cambió no corta ninguna.
   */
  async storeContent(input: StorePageContentInput): Promise<PageContentStoreOutcome> {
    return this.prisma.$transaction(async (transaction) => {
      const [current] = await transaction.$queryRaw<StoredPageContentRow[]>`
        SELECT content, title FROM "Page" WHERE id = ${input.pageId} FOR UPDATE
      `;
      if (current === undefined) return PAGE_CONTENT_STORE_OUTCOME.missing;
      if (isDeepStrictEqual(current.content, input.content)) return PAGE_CONTENT_STORE_OUTCOME.unchanged;
      const latest = await transaction.pageVersion.findFirst({
        orderBy: { version: 'desc' },
        select: { version: true },
        where: { pageId: input.pageId },
      });
      const nextVersion = (latest?.version ?? 0) + 1;
      await transaction.page.update({
        data: {
          content: input.content,
          updatedById: input.updatedById,
          versions: {
            create: {
              content: input.content,
              createdById: input.updatedById,
              title: current.title,
              version: nextVersion,
            },
          },
        },
        where: { id: input.pageId },
      });
      await this.announceNewVersion(transaction, input.pageId, nextVersion);
      return PAGE_CONTENT_STORE_OUTCOME.stored;
    });
  }

  async updatePropertyValues<TError>(
    input: UpdatePagePropertyValuesInput,
    merge: PagePropertyValuesMerge<TError>,
  ): Promise<Result<PageSummary, TError> | null> {
    return this.prisma.$transaction(async (transaction) => {
      const [current] = await transaction.$queryRaw<StoredPagePropertyValuesRow[]>`
        SELECT "propertyValues" FROM "Page" WHERE id = ${input.pageId} FOR UPDATE
      `;
      if (current === undefined) return null;
      const merged = await merge(parseSchemaPropertyValues(current.propertyValues));
      if (merged.isFail()) return Result.fail(merged.getError());
      const page = await transaction.page.update({
        data: { propertyValues: toPropertyValuesInput(merged.getValue()), updatedById: input.updatedById },
        select: pageSelection,
        where: { id: input.pageId },
      });
      await this.announceThePageChanged(page, transaction);
      const authors = await this.resolvePageAuthors([page]);
      return Result.ok(this.toSummary(page, authors));
    });
  }

  /** Avisa que la página tiene una versión nueva, para quienes proyectan su contenido. */
  private async announceNewVersion(
    transaction: Prisma.TransactionClient,
    pageId: string,
    version: number,
  ): Promise<void> {
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

  /**
   * Says out loud that a page changed without a new version of it being cut —
   * its name, or the mark it wears.
   *
   * The index keeps both, so a page renamed or re-marked and never written in
   * again would otherwise be found under what it used to be called. The moment
   * the change was written is what tells one such change from the next.
   */
  private async announceThePageChanged(
    page: { readonly id: string; readonly updatedAt: Date },
    transaction: Prisma.TransactionClient,
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
    const existing = await this.prisma.page.findFirst({
      select: { id: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (existing === null) return null;
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.update({
        data: { title, updatedById: userId },
        select: pageSelection,
        where: { id: pageId },
      });
      await this.announceThePageChanged(page, transaction);
      const authors = await this.resolvePageAuthors([page]);
      return this.toSummary(page, authors);
    });
  }

  /** Locking is not editing what the page says, so it is recorded without cutting a new version of it. */
  async setLocked(
    pageId: string,
    locked: boolean,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    const existing = await this.prisma.page.findFirst({
      select: { id: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (existing === null) return null;
    const page = await this.prisma.page.update({
      data: locked ? { lockedAt: new Date(), lockedById: userId } : { lockedAt: null, lockedById: null },
      select: pageSelection,
      where: { id: pageId },
    });
    const authors = await this.resolvePageAuthors([page]);
    return this.toSummary(page, authors);
  }

  /**
   * Vouches for a page, or takes that back.
   *
   * Verifying is stamped again every time it is asked, since asking it again
   * is the same act of vouching repeated — that is also what lets an
   * expiration be pushed out without a second endpoint. Unverifying clears the
   * three fields together, because a page that was never vouched for should
   * not still remember an expiration date. The page is announced as changed so
   * the search index, which is asked to filter by this, does not go stale.
   */
  async setVerification(
    pageId: string,
    verified: boolean,
    expiresAt: Date | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    const existing = await this.prisma.page.findFirst({
      select: { id: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (existing === null) return null;
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.update({
        data: verified
          ? { verificationExpiresAt: expiresAt, verifiedAt: new Date(), verifiedById: userId }
          : { verificationExpiresAt: null, verifiedAt: null, verifiedById: null },
        select: pageSelection,
        where: { id: pageId },
      });
      await this.announceThePageChanged(page, transaction);
      const authors = await this.resolvePageAuthors([page]);
      return this.toSummary(page, authors);
    });
  }

  /** Assigning is not editing what the page says, so it is recorded without cutting a new version of it. */
  async setOwner(
    pageId: string,
    ownerId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    const existing = await this.prisma.page.findFirst({
      select: { id: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (existing === null) return null;
    const page = await this.prisma.page.update({ data: { ownerId }, select: pageSelection, where: { id: pageId } });
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
    const existing = await this.prisma.page.findFirst({
      select: { id: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (existing === null) return null;
    const page = await this.prisma.page.update({
      data: { cover: toCoverInput(cover), updatedById: userId },
      select: pageSelection,
      where: { id: pageId },
    });
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
    const existing = await this.prisma.page.findFirst({
      select: { id: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (existing === null) return null;
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.update({
        data: { icon: toIconInput(icon), updatedById: userId },
        select: pageSelection,
        where: { id: pageId },
      });
      await this.announceThePageChanged(page, transaction);
      const authors = await this.resolvePageAuthors([page]);
      return this.toSummary(page, authors);
    });
  }

  /**
   * What a move has to be judged against: the page, and the trees of both the
   * space it leaves and the one it arrives at.
   *
   * The destination space is only looked at when it is one this reader may see,
   * so a page cannot be sent into a space its own author cannot reach.
   */
  async findMoveContext(
    pageId: string,
    targetSpaceId: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageMoveContext | null> {
    const page = await this.prisma.page.findFirst({
      select: { id: true, parentId: true, propertyValues: true, spaceId: true, title: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (page === null) return null;
    const destinationSpaceId =
      targetSpaceId === null || targetSpaceId === page.spaceId
        ? null
        : await findAccessibleSpaceId(this.prisma, targetSpaceId, workspaceId, userId, role);
    if (targetSpaceId !== null && targetSpaceId !== page.spaceId && destinationSpaceId === null) return null;
    const spaceIds = destinationSpaceId === null ? [page.spaceId] : [page.spaceId, destinationSpaceId];
    const pages = await this.prisma.page.findMany({
      orderBy: [...PAGE_SIBLING_ORDER],
      select: { id: true, parentId: true, spaceId: true },
      where: { spaceId: { in: spaceIds } },
    });
    return {
      pageId: page.id,
      pages,
      propertyValues: parseSchemaPropertyValues(page.propertyValues),
      spaceId: page.spaceId,
      title: page.title,
    };
  }

  /** Every page this reader can see that carries properties at all, which is where an assignment could be written. */
  async listWithProperties(workspaceId: string, userId: string, role: UserRole): Promise<readonly PageSummary[]> {
    const pages = await this.prisma.page.findMany({
      orderBy: { updatedAt: 'desc' },
      select: pageSelection,
      where: {
        ...this.pageAccessFilter(workspaceId, userId, role),
        lifecycle: PageLifecycle.ACTIVE,
        parentId: { not: null },
        propertyValues: { not: Prisma.JsonNull },
      },
    });
    const authors = await this.resolvePageAuthors(pages);
    return pages.map((page) => this.toSummary(page, authors));
  }

  async listMoveDestinations(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageMoveDestinations | null> {
    const page = await this.prisma.page.findFirst({
      select: { id: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (page === null) return null;
    const spaces = await this.prisma.space.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      where: { ...buildSpaceVisibilityFilter(userId, role), workspaceId },
    });
    const pages = await this.prisma.page.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, parentId: true, spaceId: true, title: true },
      where: { lifecycle: PageLifecycle.ACTIVE, spaceId: { in: spaces.map((space) => space.id) } },
    });
    const ownBranch = new Set([pageId, ...collectDescendantIds(pageId, pages)]);
    return {
      pages: pages
        .filter((candidate) => !ownBranch.has(candidate.id))
        .map(({ id, spaceId, title }) => ({ id, spaceId, title })),
      spaces,
    };
  }

  /**
   * Sets a page down among its own sisters, in front of one of them.
   *
   * Only the order changes: whose child the page is, and which space it lives
   * in, are a different matter and stay as they were. The whole row is
   * renumbered from the top so no two sisters end up claiming the same place —
   * that is what would make the next drag land where nobody aimed.
   */
  async reorderAmongSiblings(
    pageId: string,
    beforePageId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<readonly PageSummary[] | null> {
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.findFirst({
        select: { parentId: true, spaceId: true },
        where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
      });
      if (page === null) return null;

      const sisters = await transaction.page.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
        where: { lifecycle: PageLifecycle.ACTIVE, parentId: page.parentId, spaceId: page.spaceId },
      });
      const reordered = placeBefore(sisters, pageId, beforePageId);
      if (reordered === null) return null;

      for (const [position, sister] of reordered.entries()) {
        await transaction.page.update({ data: { order: position }, where: { id: sister.id } });
      }
      const rows = await transaction.page.findMany({
        orderBy: [...PAGE_SIBLING_ORDER],
        select: pageSelection,
        where: { parentId: page.parentId, spaceId: page.spaceId },
      });
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
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.findFirst({
        select: { id: true, spaceId: true },
        where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
      });
      if (page === null) return null;
      const destinationSpaceId = await findAccessibleSpaceId(transaction, targetSpaceId, workspaceId, userId, role);
      if (destinationSpaceId === null) return null;
      if (parentId !== null) {
        const parent = await transaction.page.findFirst({
          select: { id: true },
          where: { id: parentId, spaceId: destinationSpaceId },
        });
        if (parent === null) return null;
      }
      await this.carryBranchIntoSpace(transaction, pageId, page.spaceId, destinationSpaceId, mutationId);
      const order = await this.findNextOrder(transaction, destinationSpaceId, parentId, pageId);
      const moved = await transaction.page.update({
        data: { order, parentId, spaceId: destinationSpaceId, updatedById: userId },
        select: pageSelection,
        where: { id: pageId },
      });
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

  async parentBelongsToSpace(parentId: string, spaceId: string): Promise<boolean> {
    const parent = await this.prisma.page.findFirst({ select: { id: true }, where: { id: parentId, spaceId } });
    return parent !== null;
  }

  async countDescendantsByLifecycle(
    pageId: string,
    lifecycle: PageLifecycle,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<null | number> {
    const page = await this.prisma.page.findFirst({
      select: { id: true, spaceId: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (page === null) return null;
    const hierarchy = await this.fetchSpaceHierarchy(this.prisma, page.spaceId);
    return this.countDescendantsInHierarchy(pageId, hierarchy, lifecycle);
  }

  async trashCascade(
    pageId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.findFirst({
        select: { id: true, lifecycle: true, spaceId: true },
        where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
      });
      if (page === null || page.lifecycle === PageLifecycle.TRASHED) return false;
      const hierarchy = await this.fetchSpaceHierarchy(transaction, page.spaceId);
      const activeDescendantIds = this.filterDescendantsByLifecycle(pageId, hierarchy, PageLifecycle.ACTIVE);
      const trashedPageIds = [pageId, ...activeDescendantIds];
      await transaction.page.updateMany({
        data: { lifecycle: PageLifecycle.TRASHED, trashedAt: new Date(), updatedById: userId },
        where: { id: { in: trashedPageIds } },
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
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.findFirst({
        select: { id: true, lifecycle: true, parentId: true, spaceId: true },
        where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
      });
      if (page?.lifecycle !== PageLifecycle.TRASHED) return null;
      const parent = await this.findParentInfo(transaction, page.parentId);
      const restoredToRoot = page.parentId !== null && parent?.lifecycle !== PageLifecycle.ACTIVE;
      const resolvedParentId = restoredToRoot ? null : page.parentId;
      const spaceName = restoredToRoot ? await this.findSpaceName(transaction, page.spaceId) : null;

      const hierarchy = await this.fetchSpaceHierarchy(transaction, page.spaceId);
      const trashedDescendantIds = includeChildren
        ? this.filterDescendantsByLifecycle(pageId, hierarchy, PageLifecycle.TRASHED)
        : [];

      await transaction.page.update({
        data: { lifecycle: PageLifecycle.ACTIVE, parentId: resolvedParentId, trashedAt: null, updatedById: userId },
        where: { id: pageId },
      });
      if (trashedDescendantIds.length > 0) {
        await transaction.page.updateMany({
          data: { lifecycle: PageLifecycle.ACTIVE, trashedAt: null, updatedById: userId },
          where: { id: { in: [...trashedDescendantIds] } },
        });
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
    const pages = await this.prisma.page.findMany({
      select: pageHierarchySelection,
      where: { spaceId: { in: [...accessibleSpaceIds] } },
    });
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
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.findFirst({
        select: { id: true, lifecycle: true },
        where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
      });
      if (page === null) return 'NOT_FOUND';
      if (page.lifecycle !== PageLifecycle.TRASHED) return 'NOT_TRASHED';
      await transaction.page.delete({ where: { id: pageId } });
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
    const trashedPages = await this.prisma.page.findMany({
      select: { id: true },
      where: { lifecycle: PageLifecycle.TRASHED, spaceId: { in: [...accessibleSpaceIds] } },
    });
    const trashedPageIds = trashedPages.map((page) => page.id);
    if (trashedPageIds.length === 0) return [];
    await this.prisma.page.deleteMany({ where: { id: { in: trashedPageIds } } });
    return trashedPageIds;
  }

  private accessFilter(spaceId: string, workspaceId: string, userId: string, role: UserRole): Prisma.PageWhereInput {
    return { space: { ...buildSpaceVisibilityFilter(userId, role), workspaceId }, spaceId };
  }

  private pageAccessFilter(workspaceId: string, userId: string, role: UserRole): Prisma.PageWhereInput {
    return { space: { ...buildSpaceVisibilityFilter(userId, role), workspaceId } };
  }

  private async findNextOrder(
    transaction: Prisma.TransactionClient,
    spaceId: string,
    parentId: null | string,
    excludedPageId?: string,
  ): Promise<number> {
    const siblingWhere: Prisma.PageWhereInput = { parentId, spaceId };
    if (excludedPageId !== undefined) siblingWhere.id = { not: excludedPageId };
    const sibling = await transaction.page.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
      where: siblingWhere,
    });
    return (sibling?.order ?? -1) + 1;
  }

  private toSummary(
    page: {
      content: Prisma.JsonValue;
      createdAt: Date;
      createdById: string;
      cover: Prisma.JsonValue;
      icon: Prisma.JsonValue;
      id: string;
      lifecycle: PageLifecycle;
      lockedAt: Date | null;
      order: number;
      ownerId: null | string;
      parentId: null | string;
      propertyValues: Prisma.JsonValue;
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
    client: Prisma.TransactionClient,
    spaceId: string,
  ): Promise<readonly PageHierarchyRow[]> {
    return client.page.findMany({ select: pageHierarchySelection, where: { spaceId } });
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
    transaction: Prisma.TransactionClient,
    parentId: null | string,
  ): Promise<null | { lifecycle: PageLifecycle; title: string }> {
    if (parentId === null) return null;
    return transaction.page.findFirst({ select: { lifecycle: true, title: true }, where: { id: parentId } });
  }

  private async findSpaceName(transaction: Prisma.TransactionClient, spaceId: string): Promise<null | string> {
    const space = await transaction.space.findFirst({ select: { name: true }, where: { id: spaceId } });
    return space?.name ?? null;
  }

  /**
   * Takes whatever hangs from a moved page into the space it lands in.
   *
   * A page does not travel alone: splitting a branch across two spaces would
   * leave its own children where nobody can reach them from it. Each one is
   * announced as moved too, because the index that finds them records the space
   * they belong to, and an unannounced page keeps answering for the old one.
   *
   * Who last edited them is left alone: a page carried along by its mother was
   * not written by whoever moved her.
   */
  private async carryBranchIntoSpace(
    transaction: Prisma.TransactionClient,
    pageId: string,
    sourceSpaceId: string,
    destinationSpaceId: string,
    mutationId: string,
  ): Promise<void> {
    if (sourceSpaceId === destinationSpaceId) return;
    const pages = await transaction.page.findMany({
      select: { id: true, parentId: true, spaceId: true },
      where: { spaceId: sourceSpaceId },
    });
    const descendantIds = collectDescendantIds(pageId, pages);
    if (descendantIds.length === 0) return;
    await transaction.page.updateMany({
      data: { spaceId: destinationSpaceId },
      where: { id: { in: [...descendantIds] } },
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

  /** One page written again under a new parent, with everything it wore and everything it said. */
  private async writeThePageCopy(
    transaction: Prisma.TransactionClient,
    original: PageCopySource,
    title: string,
    parentId: null | string,
    order: number,
    userId: string,
  ) {
    const content = validatePageContent(original.content);
    if (content.isFail()) return null;
    const copy = await transaction.page.create({
      data: {
        content: content.getValue(),
        cover: toCoverInput(parsePageCover(original.cover)),
        createdById: userId,
        icon: toIconInput(parseStoredPageIcon(original.icon)),
        order,
        parentId,
        propertyValues: toPropertyValuesInput(parseSchemaPropertyValues(original.propertyValues)),
        spaceId: original.spaceId,
        title,
        updatedById: userId,
        versions: { create: { content: content.getValue(), createdById: userId, title, version: 1 } },
      },
      select: pageSelection,
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

  /**
   * Writes the branch under a page again, under its copy.
   *
   * Walked from the top down so every page finds its new parent already written:
   * a child copied before its mother would have nowhere to hang from.
   */
  private async copyTheBranchUnder(
    transaction: Prisma.TransactionClient,
    original: { id: string; spaceId: string },
    copyId: string,
    userId: string,
  ): Promise<void> {
    const pages = await transaction.page.findMany({
      orderBy: [...PAGE_SIBLING_ORDER],
      select: pageCopySelection,
      where: { lifecycle: PageLifecycle.ACTIVE, spaceId: original.spaceId },
    });
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
    transaction: Prisma.TransactionClient,
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
    const spaces = await this.prisma.space.findMany({
      select: { id: true },
      where: {
        workspaceId,
        ...buildSpaceVisibilityFilter(userId, role),
        ...(spaceId === null ? {} : { id: spaceId }),
      },
    });
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
    const users = await this.prisma.user.findMany({
      select: { id: true, name: true },
      where: { id: { in: uniqueUserIds } },
    });
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
