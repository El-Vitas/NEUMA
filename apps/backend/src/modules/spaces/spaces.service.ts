import type { UserRole } from '@company-brain/shared';
import { Result } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { canCreateSpace } from '../../common/domain/workspace.policy';
import { SpaceAccessDeniedError } from './domain/space.error';
import { SpaceRepository } from './infrastructure/persistence/space.repository';
import type { CreateSpaceInput, SpaceSummary } from './types/space.types';

@Injectable()
export class SpacesService {
  constructor(private readonly spaceRepository: SpaceRepository) {}

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly SpaceSummary[]> {
    return this.spaceRepository.listAccessible(workspaceId, userId, role);
  }

  async create(input: CreateSpaceInput, role: UserRole): Promise<Result<SpaceSummary, SpaceAccessDeniedError>> {
    if (!canCreateSpace(role)) {
      return Result.fail(new SpaceAccessDeniedError());
    }
    return Result.ok(await this.spaceRepository.create(input));
  }
}
