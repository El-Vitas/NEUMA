import { Injectable } from '@nestjs/common';
import { SpaceVisibility } from '@neuma/db';
import { Prisma } from '@neuma/db/generated';
import { type PageIcon, type UserRole } from '@neuma/shared';
import { placeBefore } from '../../../../common/domain/ordering.domain';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { canReadSpace, canRenameSpace, canShareSpace } from '../../../../common/domain/workspace.domain';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { toPageIconInput } from '../../../../common/infrastructure/persistence/page-icon.adapter';
import {
  buildSpaceVisibilityFilter,
  findAccessibleSpaceId,
} from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { WorkspaceMemberRepository } from '../../../../common/infrastructure/persistence/workspace-member.repository';
import type { AssignableMember } from '../../../../common/types/workspace-member.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SPACE_PRIVATE_DEFAULT_NAME } from '../../constants/spaces.constants';
import type {
  AddSpaceMemberOutcome,
  CreateSpaceInput,
  SpaceRepositoryContract,
  SpaceSummary,
} from '../../types/space.types';
import { buildPrivateSpaceSlug } from '../../utils/space.utils';

const spaceSelection = {
  description: true,
  icon: true,
  id: true,
  name: true,
  order: true,
  ownerId: true,
  slug: true,
  visibility: true,
} satisfies Prisma.SpaceSelect;

@Injectable()
export class SpaceRepository implements SpaceRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepository: OutboxRepository,
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly SpaceSummary[]> {
    await this.ensurePrivateSpace(workspaceId, userId);
    const spaces = await this.prisma.space.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: spaceSelection,
      where: { workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
    });
    return spaces.map((space) => ({ ...space, icon: parseStoredPageIcon(space.icon) }));
  }

  async listSharedWithMe(workspaceId: string, userId: string): Promise<readonly SpaceSummary[]> {
    const spaces = await this.prisma.space.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: spaceSelection,
      where: {
        members: { some: { userId } },
        ownerId: { not: userId },
        visibility: SpaceVisibility.PRIVATE,
        workspaceId,
      },
    });
    return spaces.map((space) => ({ ...space, icon: parseStoredPageIcon(space.icon) }));
  }

  async addMember(
    spaceId: string,
    memberUserId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<AddSpaceMemberOutcome> {
    const space = await this.prisma.space.findFirst({
      select: { id: true, ownerId: true, visibility: true },
      where: { id: spaceId, workspaceId },
    });
    if (space === null) return 'not-found';
    if (!canReadSpace(role, space.visibility, false, space.ownerId === userId)) return 'not-found';
    if (!canShareSpace(space.visibility, space.ownerId, userId)) return 'forbidden';
    const activeMemberIds = await this.workspaceMemberRepository.listActiveMemberIds(workspaceId);
    if (!activeMemberIds.includes(memberUserId)) return 'not-assignable';
    // Idempotent: the unique (space, user) pair settles repeats without a prior read.
    await this.prisma.spaceMember.createMany({
      data: [{ spaceId: space.id, userId: memberUserId }],
      skipDuplicates: true,
    });
    return 'shared';
  }

  /** Renumbers the whole list from the top, since gaps and ties left by a single nudge break the next drag. */
  async reorder(
    spaceId: string,
    beforeSpaceId: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly SpaceSummary[] | null> {
    const visible = await this.listAccessible(workspaceId, userId, role);
    const reordered = placeBefore(visible, spaceId, beforeSpaceId);
    if (reordered === null) return null;
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
    const changeableId = await this.findChangeableSpaceId(spaceId, workspaceId, userId, role);
    if (changeableId === null) return null;
    const space = await this.prisma.space.update({
      data: { name },
      select: spaceSelection,
      where: { id: changeableId },
    });
    return { ...space, icon: parseStoredPageIcon(space.icon) };
  }

  async describeSpace(
    spaceId: string,
    description: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<SpaceSummary | null> {
    const changeableId = await this.findChangeableSpaceId(spaceId, workspaceId, userId, role);
    if (changeableId === null) return null;
    const space = await this.prisma.space.update({
      data: { description },
      select: spaceSelection,
      where: { id: changeableId },
    });
    return { ...space, icon: parseStoredPageIcon(space.icon) };
  }

  /** Reaching a space is not enough to change it: a private space answers only to its owner, even when shared. */
  private async findChangeableSpaceId(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<string | null> {
    const reachable = await this.prisma.space.findFirst({
      select: { id: true, ownerId: true, visibility: true },
      where: { id: spaceId, workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
    });
    if (reachable === null) return null;
    return canRenameSpace(role, reachable.visibility, reachable.ownerId, userId) ? reachable.id : null;
  }

  async updateIcon(
    spaceId: string,
    icon: PageIcon | null,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<SpaceSummary | null> {
    const changeableId = await this.findChangeableSpaceId(spaceId, workspaceId, userId, role);
    if (changeableId === null) return null;
    // Returns the input icon instead of re-parsing the stored row.
    const space = await this.prisma.space.update({
      data: { icon: toPageIconInput(icon) },
      select: { description: true, id: true, name: true, order: true, ownerId: true, slug: true, visibility: true },
      where: { id: changeableId },
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

  /** Members who can read the source space but not the destination. */
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
      this.prisma.space.findUniqueOrThrow({
        select: { ownerId: true, visibility: true },
        where: { id: accessibleSourceId },
      }),
      this.prisma.space.findUniqueOrThrow({
        select: { ownerId: true, visibility: true },
        where: { id: accessibleTargetId },
      }),
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
      const canReadSource = canReadSpace(
        member.role,
        sourceSpace.visibility,
        sourceMemberIds.has(member.userId),
        sourceSpace.ownerId === member.userId,
      );
      const canReadTarget = canReadSpace(
        member.role,
        targetSpace.visibility,
        targetMemberIds.has(member.userId),
        targetSpace.ownerId === member.userId,
      );
      return canReadSource && !canReadTarget;
    }).length;
  }

  /** Created lazily the first time the space would be listed. */
  private async ensurePrivateSpace(workspaceId: string, userId: string): Promise<void> {
    const slug = buildPrivateSpaceSlug(userId);
    // The unique (workspaceId, slug) on a deterministic slug lets one concurrent request win without a prior read.
    await this.prisma.space.createMany({
      data: [
        {
          name: SPACE_PRIVATE_DEFAULT_NAME,
          ownerId: userId,
          slug,
          visibility: SpaceVisibility.PRIVATE,
          workspaceId,
        },
      ],
      skipDuplicates: true,
    });
  }
}
