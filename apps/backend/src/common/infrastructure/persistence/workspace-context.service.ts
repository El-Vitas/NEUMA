import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WORKSPACE_DEFAULT_NAME, WORKSPACE_SINGLETON_KEY } from '../../constants/workspace.constants';
import type { WorkspaceSummary } from '../../types/workspace.types';

@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The workspace somebody belongs to, joining them to it the first time.
   *
   * Almost every request that carries a session passes through here, and almost
   * none of them has anything to change: the workspace is made once and a
   * membership only moves when a role does. So the ordinary path asks twice and
   * writes nothing, instead of opening a transaction and taking a lock on two
   * rows that already say what they should.
   */
  async resolveForUser(userId: string, role: UserRole): Promise<WorkspaceSummary> {
    const workspace = await this.resolveWorkspace();
    await this.ensureMembership(workspace.id, userId, role);
    return workspace;
  }

  private async resolveWorkspace(): Promise<WorkspaceSummary> {
    const existing = await this.readWorkspace();
    if (existing !== null) return existing;

    /**
     * Two first requests arriving together both try to make it; the unique key
     * lets exactly one through and the other is dropped, so neither has to read
     * first and neither can lose the race.
     */
    await this.prisma.workspace.createMany({
      data: [{ name: WORKSPACE_DEFAULT_NAME, singletonKey: WORKSPACE_SINGLETON_KEY }],
      skipDuplicates: true,
    });
    const created = await this.readWorkspace();
    if (created === null) throw new Error('The workspace could not be resolved');
    return created;
  }

  private async readWorkspace(): Promise<null | WorkspaceSummary> {
    return this.prisma.workspace.findUnique({
      select: { id: true, name: true },
      where: { singletonKey: WORKSPACE_SINGLETON_KEY },
    });
  }

  private async ensureMembership(workspaceId: string, userId: string, role: UserRole): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      select: { role: true },
      where: { workspaceId_userId: { userId, workspaceId } },
    });
    if (membership?.role === role) return;

    await this.prisma.workspaceMember.upsert({
      create: { role, userId, workspaceId },
      update: { role },
      where: { workspaceId_userId: { userId, workspaceId } },
    });
  }
}
