import { PageLifecycle } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { parseSchemaPropertyValues } from '../../../../common/infrastructure/persistence/schema-json.adapter';
import {
  buildSpaceVisibilityFilter,
  findAccessibleSpaceId,
} from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { collectDescendantIds, pageTitleMatchesSearch } from '../../domain/page.domain';
import type {
  CreatePageInput,
  PageDeleteForeverOutcome,
  PageHierarchyRow,
  PageMoveContext,
  PageRepositoryContract,
  PageRestoreOutcome,
  PageSummary,
  TrashedPageSummary,
  UpdatePageInput,
} from '../../types/page.types';

const toPropertyValuesInput = (
  propertyValues: CreatePageInput['propertyValues'],
): Prisma.InputJsonValue | typeof Prisma.JsonNull => propertyValues ?? Prisma.JsonNull;

const pageSelection = {
  content: true,
  createdAt: true,
  createdById: true,
  id: true,
  lifecycle: true,
  order: true,
  parentId: true,
  propertyValues: true,
  spaceId: true,
  title: true,
  updatedAt: true,
  updatedById: true,
  versions: { orderBy: { version: 'desc' as const }, select: { version: true }, take: 1 },
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

  async update(input: UpdatePageInput): Promise<PageSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.page.findFirst({
        select: { id: true, versions: { orderBy: { version: 'desc' }, select: { version: true }, take: 1 } },
        where: { ...this.pageAccessFilter(input.workspaceId, input.userId, input.role), id: input.pageId },
      });
      if (current === null) return null;
      const nextVersion = (current.versions[0]?.version ?? 0) + 1;
      const page = await transaction.page.update({
        data: {
          content: input.content,
          propertyValues: toPropertyValuesInput(input.propertyValues),
          title: input.title,
          updatedById: input.updatedById,
          versions: {
            create: {
              content: input.content,
              createdById: input.updatedById,
              title: input.title,
              version: nextVersion,
            },
          },
        },
        select: pageSelection,
        where: { id: input.pageId },
      });
      await this.outboxRepository.create(
        {
          aggregateId: page.id,
          aggregateType: 'PAGE',
          eventType: 'PAGE_UPDATED',
          idempotencyKey: `page:${page.id}:version:${String(nextVersion)}`,
          payload: { pageId: page.id, version: nextVersion },
          payloadVersion: 1,
        },
        transaction,
      );
      const authors = await this.resolvePageAuthors([page]);
      return this.toSummary(page, authors);
    });
  }

  async findMoveContext(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageMoveContext | null> {
    const page = await this.prisma.page.findFirst({
      select: { id: true, parentId: true, propertyValues: true, spaceId: true, title: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (page === null) return null;
    const pages = await this.prisma.page.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, parentId: true, spaceId: true },
      where: { spaceId: page.spaceId },
    });
    return {
      pageId: page.id,
      pages,
      propertyValues: parseSchemaPropertyValues(page.propertyValues),
      title: page.title,
    };
  }

  async move(
    pageId: string,
    parentId: null | string,
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
      if (parentId !== null) {
        const parent = await transaction.page.findFirst({
          select: { id: true },
          where: { id: parentId, spaceId: page.spaceId },
        });
        if (parent === null) return null;
      }
      const order = await this.findNextOrder(transaction, page.spaceId, parentId, pageId);
      const moved = await transaction.page.update({
        data: { order, parentId, updatedById: userId },
        select: pageSelection,
        where: { id: pageId },
      });
      await this.outboxRepository.create(
        {
          aggregateId: moved.id,
          aggregateType: 'PAGE',
          eventType: 'PAGE_MOVED',
          idempotencyKey: `page:${moved.id}:move:${mutationId}`,
          payload: { pageId: moved.id, parentId, spaceId: page.spaceId },
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
      if (page === null || page.lifecycle !== PageLifecycle.TRASHED) return null;
      const parentLifecycle = await this.findParentLifecycle(transaction, page.parentId);
      const restoredToRoot = page.parentId !== null && parentLifecycle !== PageLifecycle.ACTIVE;
      const resolvedParentId = restoredToRoot ? null : page.parentId;

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

      return { restoredChildCount: trashedDescendantIds.length, restoredToRoot };
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
      id: string;
      lifecycle: PageLifecycle;
      order: number;
      parentId: null | string;
      propertyValues: Prisma.JsonValue;
      spaceId: string;
      title: string;
      updatedAt: Date;
      updatedById: string;
      versions: readonly { version: number }[];
    },
    users: ReadonlyMap<string, { id: string; name: string }>,
  ): PageSummary {
    return {
      content: page.content,
      createdAt: page.createdAt,
      createdBy: users.get(page.createdById) ?? null,
      id: page.id,
      lifecycle: page.lifecycle,
      order: page.order,
      parentId: page.parentId,
      propertyValues: parseSchemaPropertyValues(page.propertyValues),
      spaceId: page.spaceId,
      title: page.title,
      updatedAt: page.updatedAt,
      updatedBy: users.get(page.updatedById) ?? null,
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

  private async findParentLifecycle(
    transaction: Prisma.TransactionClient,
    parentId: null | string,
  ): Promise<null | PageLifecycle> {
    if (parentId === null) return null;
    const parent = await transaction.page.findFirst({ select: { lifecycle: true }, where: { id: parentId } });
    return parent?.lifecycle ?? null;
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
    pages: readonly { createdById: string; updatedById: string }[],
  ): Promise<ReadonlyMap<string, { id: string; name: string }>> {
    return this.findUsersByIds(pages.flatMap((page) => [page.createdById, page.updatedById]));
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
