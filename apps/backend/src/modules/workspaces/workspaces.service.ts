import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { WorkspaceSummary } from '../../common/types/workspace.types';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspaceContextService: WorkspaceContextService) {}

  async resolveForUser(userId: string, role: UserRole): Promise<WorkspaceSummary> {
    return this.workspaceContextService.resolveForUser(userId, role);
  }
}
