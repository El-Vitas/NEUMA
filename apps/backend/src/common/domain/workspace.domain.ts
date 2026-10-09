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

/** The target id comes from the URL, so it never grants access by itself. */
export const canRenameUser = (role: UserRole, targetUserId: string, callerId: string): boolean =>
  targetUserId === callerId || canManageWorkspace(role);

/** A private space is readable only by its owner or an explicit share, not through any role, admin included. */
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

/** A private space's owner may always rename it, even a role that cannot create spaces. */
export const canRenameSpace = (
  role: UserRole,
  visibility: SpaceVisibility,
  ownerId: null | string,
  userId: string,
): boolean => (visibility === 'PRIVATE' ? ownerId === userId : canCreateSpace(role));
