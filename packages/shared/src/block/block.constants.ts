import type { WorkspaceCapability } from '../types/workspace.types.js';

export const BLOCK_ROLE = {
  none: 'none',
  reader: 'reader',
  editor: 'editor',
  full: 'full',
} as const;

/** Ordered from least to most access; the position is the rank. */
export const BLOCK_ROLE_VALUES = [BLOCK_ROLE.none, BLOCK_ROLE.reader, BLOCK_ROLE.editor, BLOCK_ROLE.full] as const;

export const BLOCK_ROLE_CEILING_BY_CAPABILITY: Readonly<
  Record<WorkspaceCapability, (typeof BLOCK_ROLE_VALUES)[number]>
> = {
  viewer: BLOCK_ROLE.reader,
  editor: BLOCK_ROLE.editor,
  admin: BLOCK_ROLE.full,
};

/** The most an explicit grant can give: only a viewer capability (a client) is held below full. */
export const BLOCK_GRANT_MAX_ROLE_BY_CAPABILITY: Readonly<
  Record<WorkspaceCapability, (typeof BLOCK_ROLE_VALUES)[number]>
> = {
  viewer: BLOCK_ROLE.reader,
  editor: BLOCK_ROLE.full,
  admin: BLOCK_ROLE.full,
};

export const BLOCK_PRINCIPAL_KIND = {
  user: 'user',
  space: 'space',
} as const;

export const BLOCK_PERMISSION_ENTRY_LIMIT = 100;

export const BLOCK_PERMISSION_USER_ID_MAX_LENGTH = 64;
