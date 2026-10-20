import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BlockAccessRepository } from './block-access.repository';

/** Which of some people may read one block, each judged with their own role as the block sync judges them. */
@Injectable()
export class BlockAudienceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockAccess: BlockAccessRepository,
  ) {}

  async findReadersOf(blockId: string, userIds: readonly string[], workspaceId: string): Promise<ReadonlySet<string>> {
    if (userIds.length === 0) return new Set();
    const people = await this.prisma.models.User.select('id', 'role')
      .where({ isActive: true })
      .where((user) => user.id.in([...new Set(userIds)]))
      .where((user) => user.workspaceMemberships.some({ workspaceId }))
      .all();
    const verdicts = await Promise.all(
      people.map(async (person) => {
        const readable = await this.blockAccess.findReadableBlockIds([blockId], {
          role: person.role,
          userId: person.id,
          workspaceId,
        });
        return readable.has(blockId) ? person.id : null;
      }),
    );
    return new Set(verdicts.flatMap((verdict) => (verdict === null ? [] : [verdict])));
  }
}
