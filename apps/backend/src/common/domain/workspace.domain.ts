import type { SpaceVisibility } from '@company-brain/db';
import {
  canEditContent,
  canManageWorkspace,
  type UserRole,
  WORKSPACE_CAPABILITY_BY_ROLE,
  type WorkspaceCapability,
} from '@company-brain/shared';

export const getWorkspaceCapability = (role: UserRole): WorkspaceCapability => WORKSPACE_CAPABILITY_BY_ROLE[role];

export const canCreateSpace = (role: UserRole): boolean => canEditContent(role);

/**
 * Whether somebody may put a different name on an account.
 *
 * One's own account is always one's own to name. Any other account belongs to
 * whoever manages the workspace, and to nobody else: an identifier travelling
 * in the address says which account is meant, never that the asker may touch
 * it.
 */
export const canRenameUser = (role: UserRole, targetUserId: string, callerId: string): boolean =>
  targetUserId === callerId || canManageWorkspace(role);

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
