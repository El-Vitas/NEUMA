import { Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { WorkspaceSummary } from '../../common/types/workspace.types';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspaceContextService: WorkspaceContextService) {}

  async resolveForUser(userId: string, role: UserRole): Promise<WorkspaceSummary> {
    return this.workspaceContextService.resolveForUser(userId, role);
  }
}
