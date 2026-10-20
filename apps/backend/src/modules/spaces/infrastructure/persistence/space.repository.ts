import { Injectable } from '@nestjs/common';
import { and, SpaceVisibility } from '@neuma/db';
import { type PageIcon, type UserRole } from '@neuma/shared';
import { placeBefore } from '../../../../common/domain/ordering.domain';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { canReadSpace, canRenameSpace, canShareSpace } from '../../../../common/domain/workspace.domain';
import { toPageIconInput } from '../../../../common/infrastructure/persistence/page-icon.adapter';
import {
  buildSpaceVisibilityFilter,
  findAccessibleSpaceId,
} from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { WorkspaceMemberRepository } from '../../../../common/infrastructure/persistence/workspace-member.repository';
import type { AssignableMember } from '../../../../common/types/workspace-member.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SPACE_PRIVATE_DEFAULT_NAME, SPACE_SUMMARY_FIELDS } from '../../constants/spaces.constants';
import type {
  AddSpaceMemberOutcome,
  CreateSpaceInput,
  SpaceRepositoryContract,
  SpaceSummary,
} from '../../types/space.types';
import { buildPrivateSpaceSlug } from '../../utils/space.utils';

@Injectable()
export class SpaceRepository implements SpaceRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly SpaceSummary[]> {
    await this.ensurePrivateSpace(workspaceId, userId);
    const spaces = await this.prisma.models.Space.select(...SPACE_SUMMARY_FIELDS)
      .where({ workspaceId })
      .where(buildSpaceVisibilityFilter(userId, role))
      .orderBy([(space) => space.order.asc(), (space) => space.name.asc()])
      .all();
    return spaces.map((space) => ({ ...space, icon: parseStoredPageIcon(space.icon) }));
  }

  async listSharedWithMe(workspaceId: string, userId: string): Promise<readonly SpaceSummary[]> {
    const spaces = await this.prisma.models.Space.select(...SPACE_SUMMARY_FIELDS)
      .where({ visibility: SpaceVisibility.PRIVATE, workspaceId })
      .where((space) => and(space.members.some({ userId }), space.ownerId.neq(userId)))
      .orderBy([(space) => space.order.asc(), (space) => space.name.asc()])
      .all();
    return spaces.map((space) => ({ ...space, icon: parseStoredPageIcon(space.icon) }));
  }

  async addMember(
    spaceId: string,
    memberUserId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<AddSpaceMemberOutcome> {
    const space = await this.prisma.models.Space.select('id', 'ownerId', 'visibility')
      .where({ id: spaceId, workspaceId })
      .first();
    if (space === null) return 'not-found';
    if (!canReadSpace(role, space.visibility, false, space.ownerId === userId)) return 'not-found';
    if (!canShareSpace(space.visibility, space.ownerId, userId)) return 'forbidden';
    const activeMemberIds = await this.workspaceMemberRepository.listActiveMemberIds(workspaceId);
    if (!activeMemberIds.includes(memberUserId)) return 'not-assignable';
    // Idempotent: the unique (space, user) pair settles repeats without a prior read.
    await this.prisma.models.SpaceMember.createAndCount([{ spaceId: space.id, userId: memberUserId }], {
      onConflict: 'skip',
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
    await this.prisma.transaction(async (transaction) => {
      for (const [position, space] of reordered.entries()) {
        const updated = await transaction.orm.public.Space.where({ id: space.id }).update({ order: position });
        if (updated === null) throw new Error(`The space ${space.id} to reorder no longer exists`);
      }
    });
    return this.listAccessible(workspaceId, userId, role);
  }

  async create(input: CreateSpaceInput): Promise<SpaceSummary> {
    const space = await this.prisma.models.Space.select(...SPACE_SUMMARY_FIELDS).create({
      name: input.name,
      slug: input.slug,
      visibility: input.visibility,
      workspaceId: input.workspaceId,
    });
    return { ...space, icon: parseStoredPageIcon(space.icon) };
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
    const space = await this.prisma.models.Space.select(...SPACE_SUMMARY_FIELDS)
      .where({ id: changeableId })
      .update({ name });
    if (space === null) throw new Error(`The space ${changeableId} to rename no longer exists`);
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
    const space = await this.prisma.models.Space.select(...SPACE_SUMMARY_FIELDS)
      .where({ id: changeableId })
      .update({ description });
    if (space === null) throw new Error(`The space ${changeableId} to describe no longer exists`);
    return { ...space, icon: parseStoredPageIcon(space.icon) };
  }

  /** Reaching a space is not enough to change it: a private space answers only to its owner, even when shared. */
  private async findChangeableSpaceId(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<string | null> {
    const reachable = await this.prisma.models.Space.select('id', 'ownerId', 'visibility')
      .where({ id: spaceId, workspaceId })
      .where(buildSpaceVisibilityFilter(userId, role))
      .first();
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
    const space = await this.prisma.models.Space.select(
      'description',
      'id',
      'name',
      'order',
      'ownerId',
      'slug',
      'visibility',
    )
      .where({ id: changeableId })
      .update({ icon: toPageIconInput(icon) });
    if (space === null) throw new Error(`The space ${changeableId} to change the icon of no longer exists`);
    return { ...space, icon };
  }

  async listAssignableMembers(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly AssignableMember[] | null> {
    const accessibleSpaceId = await findAccessibleSpaceId(this.prisma.models, spaceId, workspaceId, userId, role);
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
      findAccessibleSpaceId(this.prisma.models, sourceSpaceId, workspaceId, userId, role),
      findAccessibleSpaceId(this.prisma.models, targetSpaceId, workspaceId, userId, role),
    ]);
    if (accessibleSourceId === null || accessibleTargetId === null) return null;
    if (accessibleSourceId === accessibleTargetId) return 0;

    const [sourceSpace, targetSpace] = await Promise.all([
      this.readSpaceOwnership(accessibleSourceId),
      this.readSpaceOwnership(accessibleTargetId),
    ]);
    if (targetSpace.visibility === SpaceVisibility.PUBLIC_INTERNAL) return 0;

    const [members, sourceMembers, targetMembers] = await Promise.all([
      this.prisma.models.WorkspaceMember.select('role', 'userId')
        .where({ workspaceId })
        .where((member) => member.user.some({ isActive: true }))
        .all(),
      this.prisma.models.SpaceMember.select('userId').where({ spaceId: accessibleSourceId }).all(),
      this.prisma.models.SpaceMember.select('userId').where({ spaceId: accessibleTargetId }).all(),
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

  private async readSpaceOwnership(spaceId: string): Promise<{ ownerId: null | string; visibility: SpaceVisibility }> {
    const space = await this.prisma.models.Space.select('ownerId', 'visibility').where({ id: spaceId }).first();
    if (space === null) throw new Error(`The space ${spaceId} could not be found`);
    return space;
  }

  /** Created lazily the first time the space would be listed. */
  private async ensurePrivateSpace(workspaceId: string, userId: string): Promise<void> {
    const slug = buildPrivateSpaceSlug(userId);
    // The unique (workspaceId, slug) on a deterministic slug lets one concurrent request win without a prior read.
    await this.prisma.models.Space.createAndCount(
      [
        {
          name: SPACE_PRIVATE_DEFAULT_NAME,
          ownerId: userId,
          slug,
          visibility: SpaceVisibility.PRIVATE,
          workspaceId,
        },
      ],
      { onConflict: 'skip' },
    );
  }
}
