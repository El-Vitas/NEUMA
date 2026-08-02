import { SpaceVisibility } from '@company-brain/db';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { canReadSpace } from '../../../../common/domain/workspace.policy';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CreateSpaceInput, SpaceSummary } from '../../types/space.types';

const prismaOrOperator = 'OR';

@Injectable()
export class SpaceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepository: OutboxRepository,
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
}
