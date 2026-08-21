import type { SpaceVisibility } from '@company-brain/db';
import type { PageIcon, UserRole } from '@company-brain/shared';
import type { AssignableMember } from '../../../common/types/workspace-member.types';

export type AddSpaceMemberOutcome = 'forbidden' | 'not-assignable' | 'not-found' | 'shared';

export interface CreateSpaceInput {
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
  readonly workspaceId: string;
}

export interface SpaceSummary {
  /** What the space says it is for, in its own words. Null while nobody has said. */
  readonly description: null | string;
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly name: string;
  /** Where the space sits in its workspace's own order, which people set by dragging. */
  readonly order: number;
  /** Who a `PRIVATE` space belongs to. Null for every other visibility. */
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
  /** `null` erases what the space said about itself, rather than leaving an empty sentence behind. */
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
