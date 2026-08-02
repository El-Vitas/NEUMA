import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { WorkspaceSummary } from '../../types/workspace.types';

const workspaceMemberUniqueKey = 'workspaceId_userId';

@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(userId: string, role: UserRole): Promise<WorkspaceSummary> {
    return this.prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.upsert({
        create: { name: 'Company Brain', singletonKey: 'default' },
        update: {},
        where: { singletonKey: 'default' },
      });
      await transaction.workspaceMember.upsert({
        create: { role, userId, workspaceId: workspace.id },
        update: { role },
        where: { [workspaceMemberUniqueKey]: { userId, workspaceId: workspace.id } },
      });
      return { id: workspace.id, name: workspace.name };
    });
  }
}
