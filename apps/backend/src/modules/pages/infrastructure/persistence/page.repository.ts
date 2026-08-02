import { PageLifecycle, SpaceVisibility } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { canReadSpace } from '../../../../common/domain/workspace.policy';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  CreatePageInput,
  PageMoveContext,
  PageRepositoryContract,
  PageSummary,
  UpdatePageInput,
} from '../../types/page.types';

const prismaOrOperator = 'OR';

const pageSelection = {
  content: true,
  id: true,
  lifecycle: true,
  order: true,
  parentId: true,
  spaceId: true,
  title: true,
  versions: { orderBy: { version: 'desc' as const }, select: { version: true }, take: 1 },
} satisfies Prisma.PageSelect;

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
    return pages.map((page) => this.toSummary(page));
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
    return page === null ? null : this.toSummary(page);
  }

  async create(input: CreatePageInput): Promise<PageSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const accessibleSpace = await transaction.space.findFirst({
        select: { id: true },
        where: {
          id: input.spaceId,
          workspaceId: input.workspaceId,
          ...this.spaceAccessFilter(input.userId, input.role),
        },
      });
      if (accessibleSpace === null) return null;
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
      return this.toSummary(page);
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
      return this.toSummary(page);
    });
  }

  async findMoveContext(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageMoveContext | null> {
    const page = await this.prisma.page.findFirst({
      select: { id: true, parentId: true, spaceId: true },
      where: { ...this.pageAccessFilter(workspaceId, userId, role), id: pageId },
    });
    if (page === null) return null;
    const pages = await this.prisma.page.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, parentId: true, spaceId: true },
      where: { spaceId: page.spaceId },
    });
    return { pageId: page.id, pages };
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
      return this.toSummary(moved);
    });
  }

  async parentBelongsToSpace(parentId: string, spaceId: string): Promise<boolean> {
    const parent = await this.prisma.page.findFirst({ select: { id: true }, where: { id: parentId, spaceId } });
    return parent !== null;
  }

  async setLifecycle(
    pageId: string,
    lifecycle: PageLifecycle,
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
      if (page === null || page.lifecycle === lifecycle) return false;
      await transaction.page.update({
        data: { lifecycle, trashedAt: lifecycle === PageLifecycle.TRASHED ? new Date() : null, updatedById: userId },
        where: { id: pageId },
      });
      await this.outboxRepository.create(
        {
          aggregateId: page.id,
          aggregateType: 'PAGE',
          eventType: lifecycle === PageLifecycle.TRASHED ? 'PAGE_TRASHED' : 'PAGE_RESTORED',
          idempotencyKey: `page:${page.id}:${lifecycle}:${mutationId}`,
          payload: { lifecycle, pageId: page.id, spaceId: page.spaceId },
          payloadVersion: 1,
        },
        transaction,
      );
      return true;
    });
  }

  private accessFilter(spaceId: string, workspaceId: string, userId: string, role: UserRole): Prisma.PageWhereInput {
    return {
      space: {
        [prismaOrOperator]: [
          { visibility: SpaceVisibility.PUBLIC_INTERNAL },
          ...(canReadSpace(role, SpaceVisibility.RESTRICTED, false)
            ? [{ visibility: SpaceVisibility.RESTRICTED }]
            : [{ members: { some: { userId } }, visibility: SpaceVisibility.RESTRICTED }]),
        ],
        workspaceId,
      },
      spaceId,
    };
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

  private pageAccessFilter(workspaceId: string, userId: string, role: UserRole): Prisma.PageWhereInput {
    return {
      space: {
        [prismaOrOperator]: [
          { visibility: SpaceVisibility.PUBLIC_INTERNAL },
          ...(canReadSpace(role, SpaceVisibility.RESTRICTED, false)
            ? [{ visibility: SpaceVisibility.RESTRICTED }]
            : [{ members: { some: { userId } }, visibility: SpaceVisibility.RESTRICTED }]),
        ],
        workspaceId,
      },
    };
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

  private toSummary(page: {
    content: Prisma.JsonValue;
    id: string;
    lifecycle: PageLifecycle;
    order: number;
    parentId: null | string;
    spaceId: string;
    title: string;
    versions: readonly { version: number }[];
  }): PageSummary {
    return {
      content: page.content,
      id: page.id,
      lifecycle: page.lifecycle,
      order: page.order,
      parentId: page.parentId,
      spaceId: page.spaceId,
      title: page.title,
      version: page.versions[0]?.version ?? 0,
    };
  }
}
