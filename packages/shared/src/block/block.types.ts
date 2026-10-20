import type { UserRole } from '../types/user-role.types.js';
import type { BLOCK_PRINCIPAL_KIND, BLOCK_ROLE_VALUES } from './block.constants.js';

export type BlockRole = (typeof BLOCK_ROLE_VALUES)[number];

export type BlockPrincipal =
  | { kind: typeof BLOCK_PRINCIPAL_KIND.user; userId: string }
  | { kind: typeof BLOCK_PRINCIPAL_KIND.space };

export interface BlockPermissionEntry {
  principal: BlockPrincipal;
  role: BlockRole;
}

/** Null means the block inherits from its nearest ancestor that declares permissions. */
export type BlockPermissions = BlockPermissionEntry[] | null;

export interface BlockAncestorPermissions {
  id: string;
  permissions: BlockPermissions;
}

export interface BlockViewer {
  userId: string;
  workspaceRole: UserRole;
}

export interface BlockRoleInput {
  viewer: BlockViewer;
  canReadSpace: boolean;
  /** From the block itself up to its top-level ancestor. */
  chain: readonly BlockAncestorPermissions[];
}

export interface BlockWithRole {
  id: string;
  role: BlockRole;
}
