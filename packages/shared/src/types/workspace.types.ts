import { USER_ROLE, type UserRole } from './user-role.types.js';

export type WorkspaceCapability = 'admin' | 'editor' | 'viewer';

export const WORKSPACE_CAPABILITY_BY_ROLE: Readonly<Record<UserRole, WorkspaceCapability>> = {
  [USER_ROLE.ADMIN]: 'admin',
  [USER_ROLE.WORKER]: 'editor',
  [USER_ROLE.CLIENT]: 'viewer',
};

/** Who runs the workspace, and so may see and change what is kept about the people in it. */
export const canManageWorkspace = (role: UserRole): boolean => WORKSPACE_CAPABILITY_BY_ROLE[role] === 'admin';

/** Who may write, as opposed to only read. */
export const canEditContent = (role: UserRole): boolean => WORKSPACE_CAPABILITY_BY_ROLE[role] !== 'viewer';
