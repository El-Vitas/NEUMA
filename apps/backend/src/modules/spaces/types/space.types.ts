import type { SpaceVisibility, UserRole } from '@company-brain/shared';
import type { AssignableMember } from '../../../common/types/workspace-member.types';

export interface CreateSpaceInput {
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
  readonly workspaceId: string;
}

export interface SpaceSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}

export interface SpaceRepositoryContract {
  readonly listAccessible: (workspaceId: string, userId: string, role: UserRole) => Promise<readonly SpaceSummary[]>;
  readonly create: (input: CreateSpaceInput) => Promise<SpaceSummary>;
  readonly listAssignableMembers: (
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<readonly AssignableMember[] | null>;
}
