import { SpaceVisibility } from '@company-brain/db';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { canReadSpace } from '../../../../common/domain/workspace.domain';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { findAccessibleSpaceId } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { WorkspaceMemberRepository } from '../../../../common/infrastructure/persistence/workspace-member.repository';
import type { AssignableMember } from '../../../../common/types/workspace-member.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CreateSpaceInput, SpaceRepositoryContract, SpaceSummary } from '../../types/space.types';

const prismaOrOperator = 'OR';

@Injectable()
export class SpaceRepository implements SpaceRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepository: OutboxRepository,
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly SpaceSummary[]> {
    const spaces = await this.prisma.space.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, visibility: true },
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
    return spaces;
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
        select: { id: true, name: true, slug: true, visibility: true },
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
      return space;
    });
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
}
