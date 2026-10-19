import { WORKSPACE_CAPABILITY_BY_ROLE } from '../types/workspace.types.js';
import {
  BLOCK_GRANT_MAX_ROLE_BY_CAPABILITY,
  BLOCK_PRINCIPAL_KIND,
  BLOCK_ROLE,
  BLOCK_ROLE_CEILING_BY_CAPABILITY,
  BLOCK_ROLE_VALUES,
} from './block.constants.js';
import type {
  BlockAncestorPermissions,
  BlockPermissionEntry,
  BlockRole,
  BlockRoleInput,
  BlockViewer,
  BlockWithRole,
} from './block.types.js';

const rankOf = (role: BlockRole): number => BLOCK_ROLE_VALUES.indexOf(role);

const hasAtLeast = (role: BlockRole, minimum: BlockRole): boolean => rankOf(role) >= rankOf(minimum);

const lowerOf = (first: BlockRole, second: BlockRole): BlockRole => (hasAtLeast(first, second) ? second : first);

const readCeiling = (viewer: BlockViewer): BlockRole =>
  BLOCK_ROLE_CEILING_BY_CAPABILITY[WORKSPACE_CAPABILITY_BY_ROLE[viewer.workspaceRole]];

const readGrantMaxRole = (viewer: BlockViewer): BlockRole =>
  BLOCK_GRANT_MAX_ROLE_BY_CAPABILITY[WORKSPACE_CAPABILITY_BY_ROLE[viewer.workspaceRole]];

const isViewerEntry = (entry: BlockPermissionEntry, userId: string): boolean =>
  entry.principal.kind === BLOCK_PRINCIPAL_KIND.user && entry.principal.userId === userId;

const isSpaceEntry = (entry: BlockPermissionEntry): boolean => entry.principal.kind === BLOCK_PRINCIPAL_KIND.space;

const readGrantedRole = (entries: readonly BlockPermissionEntry[], userId: string): BlockRole => {
  const grant = entries.find((entry) => isViewerEntry(entry, userId)) ?? entries.find(isSpaceEntry);
  return grant?.role ?? BLOCK_ROLE.none;
};

const declaresPermissions = (ancestor: BlockAncestorPermissions): boolean => ancestor.permissions !== null;

export const resolveBlockRole = ({ viewer, canReadSpace, chain }: BlockRoleInput): BlockRole => {
  if (!canReadSpace) return BLOCK_ROLE.none;

  const declaringAncestor = chain.find(declaresPermissions);
  if (!declaringAncestor?.permissions) return readCeiling(viewer);

  return lowerOf(readGrantedRole(declaringAncestor.permissions, viewer.userId), readGrantMaxRole(viewer));
};

export const canReadBlock = (role: BlockRole): boolean => hasAtLeast(role, BLOCK_ROLE.reader);

export const canEditBlock = (role: BlockRole): boolean => hasAtLeast(role, BLOCK_ROLE.editor);

export const canManageBlockPermissions = (role: BlockRole): boolean => hasAtLeast(role, BLOCK_ROLE.full);

export const filterVisibleBlockIds = (children: readonly BlockWithRole[]): string[] =>
  children.filter((child) => canReadBlock(child.role)).map((child) => child.id);
