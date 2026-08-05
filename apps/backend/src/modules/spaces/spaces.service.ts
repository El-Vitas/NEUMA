import type { UserRole } from '@company-brain/shared';
import { Result } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { canCreateSpace } from '../../common/domain/workspace.policy';
import type { AssignableMember } from '../../common/types/workspace-member.types';
import { SPACE_REPOSITORY } from './constants/spaces.constants';
import { SpaceAccessDeniedError } from './domain/space.error';
import type { CreateSpaceInput, SpaceRepositoryContract, SpaceSummary } from './types/space.types';

@Injectable()
export class SpacesService {
  constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepositoryContract) {}

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly SpaceSummary[]> {
    return this.spaceRepository.listAccessible(workspaceId, userId, role);
  }

  async create(input: CreateSpaceInput, role: UserRole): Promise<Result<SpaceSummary, SpaceAccessDeniedError>> {
    if (!canCreateSpace(role)) {
      return Result.fail(new SpaceAccessDeniedError());
    }
    return Result.ok(await this.spaceRepository.create(input));
  }

  async listAssignableMembers(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<readonly AssignableMember[], SpaceAccessDeniedError>> {
    const members = await this.spaceRepository.listAssignableMembers(spaceId, workspaceId, userId, role);
    return members === null ? Result.fail(new SpaceAccessDeniedError()) : Result.ok(members);
  }
}
