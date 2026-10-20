import type { BlockAncestorPermissions, BlockPermissions, BlockRole } from '@neuma/shared';

/** What a declaring ancestor is looked up from: the block, its parent and the permissions it declares. */
export interface BlockDeclarationSource {
  readonly id: string;
  readonly parentId: string | null;
  readonly permissions: BlockPermissions;
}

/** What a role is resolved from: a declaration source and the space the block lives in. */
export interface BlockRoleSource extends BlockDeclarationSource {
  readonly spaceId: string;
}

export type DeclarationSourcesById = ReadonlyMap<string, BlockDeclarationSource>;

export type RoleSourcesById = ReadonlyMap<string, BlockRoleSource>;

export type RolesById = ReadonlyMap<string, BlockRole>;

/** The nearest block, from one upwards, that declares permissions; null when none does. */
export type DeclaringAncestor = BlockAncestorPermissions | null;

export type DeclaringAncestorsById = ReadonlyMap<string, DeclaringAncestor>;
