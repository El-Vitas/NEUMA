import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AssignableMember } from '../../types/workspace-member.types';

@Injectable()
export class WorkspaceMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAssignableMembers(workspaceId: string): Promise<readonly AssignableMember[]> {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { email: true, id: true, name: true },
      where: { isActive: true, workspaceMemberships: { some: { workspaceId } } },
    });
  }

  async listActiveMemberIds(workspaceId: string): Promise<readonly string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      orderBy: { userId: 'asc' },
      select: { userId: true },
      where: { user: { isActive: true }, workspaceId },
    });
    return members.map((member) => member.userId);
  }
}
