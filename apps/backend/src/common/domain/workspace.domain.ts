import type { SpaceVisibility } from '@company-brain/db';
import { type UserRole, WORKSPACE_CAPABILITY_BY_ROLE, type WorkspaceCapability } from '@company-brain/shared';

export const getWorkspaceCapability = (role: UserRole): WorkspaceCapability => WORKSPACE_CAPABILITY_BY_ROLE[role];

export const canManageWorkspace = (role: UserRole): boolean => getWorkspaceCapability(role) === 'admin';

export const canCreateSpace = (role: UserRole): boolean => getWorkspaceCapability(role) !== 'viewer';

/**
 * A private space answers only to its owner: no role, including admin, reads it
 * through workspace capability the way `PUBLIC_INTERNAL` and `RESTRICTED` do.
 * Ownership or an explicit `SpaceMember` row (a share) are the only ways in.
 */
export const canReadSpace = (
  role: UserRole,
  visibility: SpaceVisibility,
  isMember: boolean,
  isOwner = false,
): boolean =>
  visibility === 'PRIVATE'
    ? isOwner || isMember
    : visibility === 'PUBLIC_INTERNAL' || getWorkspaceCapability(role) === 'admin' || isMember;

export const canShareSpace = (visibility: SpaceVisibility, ownerId: string | null, userId: string): boolean =>
  visibility === 'PRIVATE' && ownerId === userId;

/**
 * Whether somebody may name a space.
 *
 * A private corner answers to whoever owns it and to nobody else — including
 * someone who may not make spaces at all. Being given a private area and not
 * being allowed to name it would be half an area.
 */
export const canRenameSpace = (
  role: UserRole,
  visibility: SpaceVisibility,
  ownerId: null | string,
  userId: string,
): boolean => (visibility === 'PRIVATE' ? ownerId === userId : canCreateSpace(role));
