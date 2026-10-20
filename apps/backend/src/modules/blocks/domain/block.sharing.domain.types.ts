import type { SpaceVisibility } from '@neuma/db';
import type { BlockPermissionEntry, BlockPrincipal, BlockRole, UserRole } from '@neuma/shared';

export interface AccessUser {
  readonly email: string;
  readonly id: string;
  readonly name: string;
}

export interface WorkspaceMemberRow extends AccessUser {
  readonly workspaceRole: UserRole;
}

/** An entry as the share dialog lists it; a space entry, or a person who left the workspace, has no user. */
export interface BlockAccessEntry {
  readonly principal: BlockPrincipal;
  readonly role: BlockRole;
  readonly user: AccessUser | null;
}

export interface BlockAccessMember extends WorkspaceMemberRow {
  readonly canReadSpace: boolean;
}

export interface SpaceReadingFacts {
  readonly memberIds: ReadonlySet<string>;
  readonly ownerId: string | null;
  readonly visibility: SpaceVisibility;
}

export type BlockPermissionEntries = readonly BlockPermissionEntry[] | null;
