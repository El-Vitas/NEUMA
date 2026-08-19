import type { PageIcon, SpaceVisibility, UserRole } from '@company-brain/shared';
import type { AssignableMember } from '../../../common/types/workspace-member.types';

export interface CreateSpaceInput {
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
  readonly workspaceId: string;
}

export interface SpaceSummary {
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly name: string;
  /** Where the space sits in its workspace's own order, which people set by dragging. */
  readonly order: number;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}

export interface SpaceRepositoryContract {
  readonly listAccessible: (workspaceId: string, userId: string, role: UserRole) => Promise<readonly SpaceSummary[]>;
  readonly create: (input: CreateSpaceInput) => Promise<SpaceSummary>;
  readonly rename: (
    spaceId: string,
    name: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<SpaceSummary | null>;
  readonly updateIcon: (
    spaceId: string,
    icon: PageIcon | null,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<SpaceSummary | null>;
  readonly reorder: (
    spaceId: string,
    beforeSpaceId: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<readonly SpaceSummary[] | null>;
  readonly listAssignableMembers: (
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<readonly AssignableMember[] | null>;
}
