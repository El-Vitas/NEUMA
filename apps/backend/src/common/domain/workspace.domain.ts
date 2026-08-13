import {
  type SpaceVisibility,
  type UserRole,
  WORKSPACE_CAPABILITY_BY_ROLE,
  type WorkspaceCapability,
} from '@company-brain/shared';

export const getWorkspaceCapability = (role: UserRole): WorkspaceCapability => WORKSPACE_CAPABILITY_BY_ROLE[role];

export const canManageWorkspace = (role: UserRole): boolean => getWorkspaceCapability(role) === 'admin';

export const canCreateSpace = (role: UserRole): boolean => getWorkspaceCapability(role) !== 'viewer';

export const canReadSpace = (role: UserRole, visibility: SpaceVisibility, isMember: boolean): boolean =>
  visibility === 'PUBLIC_INTERNAL' || getWorkspaceCapability(role) === 'admin' || isMember;
