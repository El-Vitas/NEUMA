import { BLOCK_ROLE } from '@neuma/shared';
import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import type { SharingAccessState, SharingEntry } from '../types/pages.sharing.types';

export const PAGE_SHARING_API_ROUTES = {
  access: (blockId: string): string => `/api/v1/blocks/${blockId}/access`,
  transactions: '/api/v1/transactions',
} as const;

/** From least to most access; a role the dialog offers and a person can be given. */
export const PAGE_SHARING_ASSIGNABLE_ROLES = [BLOCK_ROLE.reader, BLOCK_ROLE.editor, BLOCK_ROLE.full] as const;

/** The space as a whole is never offered full access: that is for named people. */
export const PAGE_SHARING_SPACE_ROLES = [BLOCK_ROLE.reader, BLOCK_ROLE.editor] as const;

export const PAGE_SHARING_SET_PERMISSION_COMMAND = 'setPermission';

/** Roles are resolved over a chain of blocks; the declaration being judged is a chain of one. */
export const PAGE_SHARING_DECLARING_BLOCK_ID = 'declaring-block';

export const PAGE_SHARING_LOADING_STATE: SharingAccessState = { kind: 'loading' };

export const PAGE_SHARING_NO_ENTRIES: readonly SharingEntry[] = [];

export const PAGE_SHARING_BLOCK_TABLE = 'block';

/** What a new person is given when they are added to a block. */
export const PAGE_SHARING_DEFAULT_ROLE = BLOCK_ROLE.editor;

/** What the dialog tells a person for each way the backend can refuse a change to who has access. */
export const PAGE_SHARING_REFUSAL_REASON_BY_CODE: Readonly<Record<string, ActionFailureReason>> = {
  BLOCK_ACCESS_DENIED: 'forbidden',
  BLOCK_EDIT_FORBIDDEN: 'forbidden',
  BLOCK_PERMISSIONS_FORBIDDEN: 'forbidden',
  BLOCK_PERMISSIONS_LOCKOUT: 'conflict',
  PAGE_LOCKED: 'locked',
};

/** The role the rest of the space keeps when a block stops following the space: editing, within each person's limit. */
export const PAGE_SHARING_SPACE_FALLBACK_ROLE = BLOCK_ROLE.editor;

export const PAGE_SHARING_SELECT_CLASS =
  'min-h-11 w-full min-w-0 rounded-none border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

/** The message under `pages.sharing` that says why saving failed. */
export const PAGE_SHARING_SAVE_FAILURE_MESSAGE: Readonly<Record<ActionFailureReason, string>> = {
  conflict: 'saveLockout',
  forbidden: 'saveForbidden',
  invalid: 'saveError',
  locked: 'saveLocked',
  missing: 'saveError',
  offline: 'saveError',
  rateLimited: 'saveError',
  tooLarge: 'saveError',
  unexpected: 'saveError',
};
