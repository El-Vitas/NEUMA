import type { ActionFailureReason } from '@/shared/types/action-failure.types';

export const PAGE_BLOCK_TABLE = 'block';

/** What the block transaction calls each change of a relation cell. */
export const PAGE_RELATION_COMMAND = {
  ADD: 'addRelation',
  REMOVE: 'removeRelation',
} as const;

/** The refusal that gets its own message, because it names a row the person was not looking at. */
export const PAGE_RELATION_MIRROR_FORBIDDEN_CODE = 'RELATION_MIRROR_FORBIDDEN';

/** What the cell tells a person for each other way the backend can refuse a relation change. */
export const PAGE_RELATION_REFUSAL_REASON_BY_CODE: Readonly<Record<string, ActionFailureReason>> = {
  BLOCK_ACCESS_DENIED: 'forbidden',
  BLOCK_EDIT_FORBIDDEN: 'forbidden',
  PAGE_LOCKED: 'locked',
  RELATION_LIMIT_EXCEEDED: 'conflict',
};

/** Rows listed in the picker before the person narrows it down by typing. */
export const PAGE_RELATION_PICKER_VISIBLE_LIMIT = 50;
