import { Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { WORKSPACE_DEFAULT_NAME, WORKSPACE_SINGLETON_KEY } from '../../constants/workspace.constants';
import type { WorkspaceSummary } from '../../types/workspace.types';

@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  /** Runs on nearly every request, so the common path only reads and opens no transaction or lock. */
  async resolveForUser(userId: string, role: UserRole): Promise<WorkspaceSummary> {
    const workspace = await this.resolveWorkspace();
    await this.ensureMembership(workspace.id, userId, role);
    return workspace;
  }

  private async resolveWorkspace(): Promise<WorkspaceSummary> {
    const existing = await this.readWorkspace();
    if (existing !== null) return existing;

    // Concurrent first requests race here; the unique key lets one insert and skips the other.
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
