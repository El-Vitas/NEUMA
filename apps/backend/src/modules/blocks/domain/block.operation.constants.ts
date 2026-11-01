import type { CollectionRowRules } from './block.transaction.domain.types';

/** An ordinary operation tolerates no blocker: a locked or trashed block refuses it. */
export const BLOCK_NO_TOLERATED_BLOCKERS = [] as const;

/** The same words for a row that is not there, one that is hidden and one that is outside the relation. */
export const BLOCK_CANNOT_RELATE_MESSAGE = 'The row cannot be related';

export const BLOCK_NO_RELATIONS: ReadonlyMap<string, readonly never[]> = new Map();

export const BLOCK_NO_RULES: ReadonlyMap<string, CollectionRowRules> = new Map();

export const BLOCK_PROPERTIES_BAG = 'properties';

export const BLOCK_FORMAT_BAG = 'format';

export const BLOCK_BAG_VALUES = [BLOCK_PROPERTIES_BAG, BLOCK_FORMAT_BAG] as const;

/** The only top-level fields a client may write. Everything else is set by the server. */
export const BLOCK_WRITABLE_FIELD_VALUES = ['alive', 'format', 'parentId', 'properties', 'type'] as const;

/** The fields `set` may carry when it creates a block. */
export const BLOCK_CREATE_FIELD_VALUES = ['format', 'id', 'parentId', 'properties', 'type'] as const;

export const BLOCK_LINK_KIND = {
  collection: 'collection',
  mention: 'mention',
  subpage: 'subpage',
  synced: 'synced',
} as const;

/** Postgres refuses a NOTIFY payload of this many bytes or more. */
export const BLOCK_NOTIFY_PAYLOAD_LIMIT_BYTES = 8000;
