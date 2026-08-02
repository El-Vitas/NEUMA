import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import type { WorkspaceSummary } from '../../common/types/workspace.types';
import { WorkspaceRepository } from './infrastructure/persistence/workspace.repository';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  async resolveForUser(userId: string, role: UserRole): Promise<WorkspaceSummary> {
    return this.workspaceRepository.resolveForUser(userId, role);
  }
}
