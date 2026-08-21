import { SpaceVisibility } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import { type PageIcon, type UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { placeBefore } from '../../../../common/domain/ordering.domain';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { canReadSpace, canRenameSpace, canShareSpace } from '../../../../common/domain/workspace.domain';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
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

const spaceSelection = {
  description: true,
  icon: true,
  id: true,
  name: true,
  order: true,
  ownerId: true,
  slug: true,
  visibility: true,
} as const;

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
    /** Sharing twice is sharing once: the unique pair already in the table settles it, without reading first. */
    await this.prisma.spaceMember.createMany({
      data: [{ spaceId: space.id, userId: memberUserId }],
      skipDuplicates: true,
    });
    return 'shared';
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
    const reachable = await this.prisma.space.findFirst({
      select: { id: true, ownerId: true, visibility: true },
      where: { id: spaceId, workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
    });
    if (reachable === null) return null;
    /** Reaching a space is not the same as being allowed to name it: a private one answers only to its owner. */
    if (!canRenameSpace(role, reachable.visibility, reachable.ownerId, userId)) return null;
    const space = await this.prisma.space.update({
      data: { name },
      select: spaceSelection,
      where: { id: reachable.id },
    });
    return { ...space, icon: parseStoredPageIcon(space.icon) };
  }

  /** Saying what a space is for answers to the same hand that names it: the two are one decision. */
  async describeSpace(
    spaceId: string,
    description: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<SpaceSummary | null> {
    const reachable = await this.prisma.space.findFirst({
      select: { id: true, ownerId: true, visibility: true },
      where: { id: spaceId, workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
    });
    if (reachable === null) return null;
    if (!canRenameSpace(role, reachable.visibility, reachable.ownerId, userId)) return null;
    const space = await this.prisma.space.update({
      data: { description },
      select: spaceSelection,
      where: { id: reachable.id },
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
      select: { description: true, id: true, name: true, order: true, ownerId: true, slug: true, visibility: true },
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

  /**
   * The place a person's private space is created is the first time it would be
   * listed, not a step somebody has to remember. The unique `(workspaceId, slug)`
   * pair on a deterministic slug is what makes the upsert safe against two
   * concurrent requests both trying to create the same person's private space.
   */
  private async ensurePrivateSpace(workspaceId: string, userId: string): Promise<void> {
    const slug = buildPrivateSpaceSlug(userId);
    /**
     * Two requests arriving together both try to make it; the unique slug lets
     * exactly one through and the other is dropped, so neither has to read
     * first and neither can lose the race.
     */
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
