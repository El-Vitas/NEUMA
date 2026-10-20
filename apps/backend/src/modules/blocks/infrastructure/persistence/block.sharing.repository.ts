import { Injectable } from '@nestjs/common';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { AccessUser, SpaceReadingFacts, WorkspaceMemberRow } from '../../domain/block.sharing.domain.types';
import type { BlockAccessSource } from '../../types/block.sharing.types';

/** Reads only what the share dialog shows: the people on a block, those of the workspace, and the space. */
@Injectable()
export class BlockSharingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(workspaceId: string): Promise<readonly WorkspaceMemberRow[]> {
    const users = await this.prisma.models.User.select('email', 'id', 'name', 'role')
      .where({ isActive: true })
      .where((user) => user.workspaceMemberships.some({ workspaceId }))
      .orderBy((user) => user.name.asc())
      .all();
    return users.map(({ role, ...user }) => ({ ...user, workspaceRole: role }));
  }

  async readSource(blockId: string): Promise<BlockAccessSource | null> {
    const block = await this.prisma.models.Block.select('id', 'properties', 'type').where({ id: blockId }).first();
    return block === null ? null : { id: block.id, title: readBlockTitle(block.properties), type: block.type };
  }

  async readSpaceFacts(spaceId: string): Promise<SpaceReadingFacts | null> {
    const space = await this.prisma.models.Space.select('ownerId', 'visibility').where({ id: spaceId }).first();
    if (space === null) return null;
    const members = await this.prisma.models.SpaceMember.select('userId').where({ spaceId }).all();
    return {
      memberIds: new Set(members.map((member) => member.userId)),
      ownerId: space.ownerId,
      visibility: space.visibility,
    };
  }

  async readUsers(userIds: readonly string[], workspaceId: string): Promise<readonly AccessUser[]> {
    if (userIds.length === 0) return [];
    return this.prisma.models.User.select('email', 'id', 'name')
      .where((user) => user.id.in([...userIds]))
      .where((user) => user.workspaceMemberships.some({ workspaceId }))
      .all();
  }
}
