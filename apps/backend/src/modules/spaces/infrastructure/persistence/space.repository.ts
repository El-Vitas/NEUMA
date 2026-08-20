import { SpaceVisibility } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import { type PageIcon, type UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { canReadSpace } from '../../../../common/domain/workspace.domain';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { findAccessibleSpaceId } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { WorkspaceMemberRepository } from '../../../../common/infrastructure/persistence/workspace-member.repository';
import type { AssignableMember } from '../../../../common/types/workspace-member.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CreateSpaceInput, SpaceRepositoryContract, SpaceSummary } from '../../types/space.types';

const prismaOrOperator = 'OR';

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

const spaceSelection = { icon: true, id: true, name: true, order: true, slug: true, visibility: true } as const;

@Injectable()
export class SpaceRepository implements SpaceRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepository: OutboxRepository,
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly SpaceSummary[]> {
    const spaces = await this.prisma.space.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: spaceSelection,
      where: {
        workspaceId,
        [prismaOrOperator]: [
          { visibility: SpaceVisibility.PUBLIC_INTERNAL },
          ...(canReadSpace(role, SpaceVisibility.RESTRICTED, false)
            ? [{ visibility: SpaceVisibility.RESTRICTED }]
            : [{ visibility: SpaceVisibility.RESTRICTED, members: { some: { userId } } }]),
        ],
      },
    });
    return spaces.map((space) => ({ ...space, icon: parseStoredPageIcon(space.icon) }));
  }

  /**
   * Puts a space where somebody dragged it, and writes the whole order down again.
   *
   * The list is renumbered from the top rather than nudged: gaps and ties left by
   * moving one space are what make the next drag land somewhere nobody pointed at.
   * A space dropped on itself changes nothing.
   */
  async reorder(
    spaceId: string,
    beforeSpaceId: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly SpaceSummary[] | null> {
    const visible = await this.listAccessible(workspaceId, userId, role);
    const moved = visible.find((space) => space.id === spaceId);
    if (moved === undefined) return null;
    if (beforeSpaceId !== null && !visible.some((space) => space.id === beforeSpaceId)) return null;
    const remaining = visible.filter((space) => space.id !== spaceId);
    const landing = beforeSpaceId === null ? remaining.length : remaining.findIndex((s) => s.id === beforeSpaceId);
    const reordered = [...remaining.slice(0, landing), moved, ...remaining.slice(landing)];
    await this.prisma.$transaction(
      reordered.map((space, position) =>
        this.prisma.space.update({ data: { order: position }, where: { id: space.id } }),
      ),
    );
    return this.listAccessible(workspaceId, userId, role);
  }

  async create(input: CreateSpaceInput): Promise<SpaceSummary> {
    return this.prisma.$transaction(async (transaction) => {
      const space = await transaction.space.create({
        data: {
          name: input.name,
          slug: input.slug,
          visibility: input.visibility,
          workspaceId: input.workspaceId,
        },
        select: spaceSelection,
      });
      await this.outboxRepository.create(
        {
          aggregateId: space.id,
          aggregateType: 'SPACE',
          eventType: 'SPACE_CREATED',
          idempotencyKey: `space:${space.id}:created`,
          payload: { spaceId: space.id, workspaceId: input.workspaceId },
          payloadVersion: 1,
        },
        transaction,
      );
      return { ...space, icon: parseStoredPageIcon(space.icon) };
    });
  }

  async rename(
    spaceId: string,
    name: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<SpaceSummary | null> {
    const accessibleSpaceId = await findAccessibleSpaceId(this.prisma, spaceId, workspaceId, userId, role);
    if (accessibleSpaceId === null) return null;
    const space = await this.prisma.space.update({
      data: { name },
      select: spaceSelection,
      where: { id: accessibleSpaceId },
    });
    return { ...space, icon: parseStoredPageIcon(space.icon) };
  }

  async updateIcon(
    spaceId: string,
    icon: PageIcon | null,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<SpaceSummary | null> {
    const accessibleSpaceId = await findAccessibleSpaceId(this.prisma, spaceId, workspaceId, userId, role);
    if (accessibleSpaceId === null) return null;
    /** The mark handed back is the one just written, so it is not read out of the row only to be parsed again. */
    const space = await this.prisma.space.update({
      data: { icon: toIconInput(icon) },
      select: { id: true, name: true, order: true, slug: true, visibility: true },
      where: { id: accessibleSpaceId },
    });
    return { ...space, icon };
  }

  async listAssignableMembers(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly AssignableMember[] | null> {
    const accessibleSpaceId = await findAccessibleSpaceId(this.prisma, spaceId, workspaceId, userId, role);
    if (accessibleSpaceId === null) return null;
    return this.workspaceMemberRepository.listAssignableMembers(workspaceId);
  }

  /**
   * Who reads the source space today and would not read the destination — the
   * question a move across spaces has to answer before it happens. A move that
   * does not cross spaces, or that lands in a space the whole organization can
   * already read, costs nothing beyond the two access checks it needed anyway.
   */
  async countMembersLosingAccess(
    sourceSpaceId: string,
    targetSpaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<number | null> {
    const [accessibleSourceId, accessibleTargetId] = await Promise.all([
      findAccessibleSpaceId(this.prisma, sourceSpaceId, workspaceId, userId, role),
      findAccessibleSpaceId(this.prisma, targetSpaceId, workspaceId, userId, role),
    ]);
    if (accessibleSourceId === null || accessibleTargetId === null) return null;
    if (accessibleSourceId === accessibleTargetId) return 0;

    const [sourceSpace, targetSpace] = await Promise.all([
      this.prisma.space.findUniqueOrThrow({ select: { visibility: true }, where: { id: accessibleSourceId } }),
      this.prisma.space.findUniqueOrThrow({ select: { visibility: true }, where: { id: accessibleTargetId } }),
    ]);
    if (targetSpace.visibility === SpaceVisibility.PUBLIC_INTERNAL) return 0;

    const [members, sourceMembers, targetMembers] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        select: { role: true, userId: true },
        where: { user: { isActive: true }, workspaceId },
      }),
      this.prisma.spaceMember.findMany({ select: { userId: true }, where: { spaceId: accessibleSourceId } }),
      this.prisma.spaceMember.findMany({ select: { userId: true }, where: { spaceId: accessibleTargetId } }),
    ]);
    const sourceMemberIds = new Set(sourceMembers.map((member) => member.userId));
    const targetMemberIds = new Set(targetMembers.map((member) => member.userId));

    return members.filter((member) => {
      const canReadSource = canReadSpace(member.role, sourceSpace.visibility, sourceMemberIds.has(member.userId));
      const canReadTarget = canReadSpace(member.role, targetSpace.visibility, targetMemberIds.has(member.userId));
      return canReadSource && !canReadTarget;
    }).length;
  }
}
