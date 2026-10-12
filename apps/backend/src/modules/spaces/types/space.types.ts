import type { SpaceVisibility } from '@neuma/db';
import type { PageIcon, UserRole } from '@neuma/shared';
import type { AssignableMember } from '../../../common/types/workspace-member.types';

export type AddSpaceMemberOutcome = 'forbidden' | 'not-assignable' | 'not-found' | 'shared';

export interface CreateSpaceInput {
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
  readonly workspaceId: string;
}

export interface SpaceSummary {
  readonly description: null | string;
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly name: string;
  readonly order: number;
  /** Null unless the space is `PRIVATE`. */
  readonly ownerId: string | null;
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
  /** `null` clears the description instead of storing an empty string. */
  readonly describeSpace: (
    spaceId: string,
    description: null | string,
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
  readonly countMembersLosingAccess: (
    sourceSpaceId: string,
    targetSpaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<number | null>;
  readonly addMember: (
    spaceId: string,
    memberUserId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<AddSpaceMemberOutcome>;
  readonly listSharedWithMe: (workspaceId: string, userId: string) => Promise<readonly SpaceSummary[]>;
}
