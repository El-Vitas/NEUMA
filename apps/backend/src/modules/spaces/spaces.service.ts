import type { UserRole } from '@company-brain/shared';
import { Result } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { canCreateSpace } from '../../common/domain/workspace.domain';
import type { AssignableMember } from '../../common/types/workspace-member.types';
import { SPACE_REPOSITORY } from './constants/spaces.constants';
import {
  SpaceAccessDeniedError,
  SpaceIconValidationError,
  SpaceMemberNotAssignableError,
  SpaceShareForbiddenError,
} from './domain/space.error';
import { validateSpaceIcon } from './domain/space-icon.domain';
import type { CreateSpaceInput, SpaceRepositoryContract, SpaceSummary } from './types/space.types';
import { isSpaceSlugAvailableToAsk } from './utils/space.utils';

@Injectable()
export class SpacesService {
  constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepositoryContract) {}

  async listAccessible(workspaceId: string, userId: string, role: UserRole): Promise<readonly SpaceSummary[]> {
    return this.spaceRepository.listAccessible(workspaceId, userId, role);
  }

  async create(input: CreateSpaceInput, role: UserRole): Promise<Result<SpaceSummary, SpaceAccessDeniedError>> {
    if (!canCreateSpace(role) || !isSpaceSlugAvailableToAsk(input.slug)) {
      return Result.fail(new SpaceAccessDeniedError());
    }
    return Result.ok(await this.spaceRepository.create(input));
  }

  async rename(
    spaceId: string,
    name: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<SpaceSummary, SpaceAccessDeniedError>> {
    const space = await this.spaceRepository.rename(spaceId, name, workspaceId, userId, role);
    return space === null ? Result.fail(new SpaceAccessDeniedError()) : Result.ok(space);
  }

  async describeSpace(
    spaceId: string,
    description: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<SpaceSummary, SpaceAccessDeniedError>> {
    const space = await this.spaceRepository.describeSpace(spaceId, description, workspaceId, userId, role);
    return space === null ? Result.fail(new SpaceAccessDeniedError()) : Result.ok(space);
  }

  async reorder(
    spaceId: string,
    beforeSpaceId: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<readonly SpaceSummary[], SpaceAccessDeniedError>> {
    if (!canCreateSpace(role)) {
      return Result.fail(new SpaceAccessDeniedError());
    }
    const spaces = await this.spaceRepository.reorder(spaceId, beforeSpaceId, workspaceId, userId, role);
    return spaces === null ? Result.fail(new SpaceAccessDeniedError()) : Result.ok(spaces);
  }

  async updateIcon(
    spaceId: string,
    icon: unknown,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<SpaceSummary, SpaceAccessDeniedError | SpaceIconValidationError>> {
    if (!canCreateSpace(role)) {
      return Result.fail(new SpaceAccessDeniedError());
    }
    const validatedIcon = validateSpaceIcon(icon);
    if (validatedIcon.isFail()) return Result.fail(validatedIcon.getError());
    const space = await this.spaceRepository.updateIcon(spaceId, validatedIcon.getValue(), workspaceId, userId, role);
    return space === null ? Result.fail(new SpaceAccessDeniedError()) : Result.ok(space);
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

  async countMoveAccessLoss(
    sourceSpaceId: string,
    targetSpaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<number, SpaceAccessDeniedError>> {
    const count = await this.spaceRepository.countMembersLosingAccess(
      sourceSpaceId,
      targetSpaceId,
      workspaceId,
      userId,
      role,
    );
    return count === null ? Result.fail(new SpaceAccessDeniedError()) : Result.ok(count);
  }

  /** Only the owner of a private space can share it, admins included. */
  async addMember(
    spaceId: string,
    memberUserId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<null, SpaceAccessDeniedError | SpaceMemberNotAssignableError | SpaceShareForbiddenError>> {
    const outcome = await this.spaceRepository.addMember(spaceId, memberUserId, workspaceId, userId, role);
    switch (outcome) {
      case 'not-found':
        return Result.fail(new SpaceAccessDeniedError());
      case 'forbidden':
        return Result.fail(new SpaceShareForbiddenError());
      case 'not-assignable':
        return Result.fail(new SpaceMemberNotAssignableError());
      default:
        return Result.ok(null);
    }
  }

  /** Private spaces owned by others and shared with the caller, not the caller's own. */
  async listSharedWithMe(workspaceId: string, userId: string): Promise<readonly SpaceSummary[]> {
    return this.spaceRepository.listSharedWithMe(workspaceId, userId);
  }
}
