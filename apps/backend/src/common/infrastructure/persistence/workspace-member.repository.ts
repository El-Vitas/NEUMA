import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AssignableMember } from '../../types/workspace-member.types';

@Injectable()
export class WorkspaceMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAssignableMembers(workspaceId: string): Promise<readonly AssignableMember[]> {
    return this.prisma.models.User.select('email', 'id', 'name')
      .where({ isActive: true })
      .where((user) => user.workspaceMemberships.some({ workspaceId }))
      .orderBy((user) => user.name.asc())
      .all();
  }

  async listActiveMemberIds(workspaceId: string): Promise<readonly string[]> {
    const members = await this.prisma.models.WorkspaceMember.select('userId')
      .where({ workspaceId })
      .where((member) => member.user.some({ isActive: true }))
      .orderBy((member) => member.userId.asc())
      .all();
    return members.map((member) => member.userId);
  }
}
