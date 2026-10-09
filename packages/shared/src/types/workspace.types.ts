import { USER_ROLE, type UserRole } from './user-role.types.js';

export type WorkspaceCapability = 'admin' | 'editor' | 'viewer';

export const WORKSPACE_CAPABILITY_BY_ROLE: Readonly<Record<UserRole, WorkspaceCapability>> = {
  [USER_ROLE.ADMIN]: 'admin',
  [USER_ROLE.WORKER]: 'editor',
  [USER_ROLE.CLIENT]: 'viewer',
};

export const canManageWorkspace = (role: UserRole): boolean => WORKSPACE_CAPABILITY_BY_ROLE[role] === 'admin';

export const canEditContent = (role: UserRole): boolean => WORKSPACE_CAPABILITY_BY_ROLE[role] !== 'viewer';
