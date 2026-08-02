import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { WorkspaceContextService } from '../../../../common/infrastructure/persistence/workspace-context.service';

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly workspaceContextService: WorkspaceContextService) {}

  async resolveForUser(userId: string, role: UserRole): Promise<{ id: string; name: string }> {
    return this.workspaceContextService.resolveForUser(userId, role);
  }
}
