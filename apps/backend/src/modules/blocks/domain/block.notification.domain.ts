import { BLOCK_NOTIFY_PAYLOAD_LIMIT_BYTES } from './block.operation.constants';
import type { BlockVersion } from './block.transaction.domain.types';

/**
 * The payload of the version notification. When the blocks do not fit in what Postgres allows, it carries no
 * blocks and says so, and the listener reads the versions itself.
 */
export const buildVersionNotification = (
  transactionId: string,
  spaceId: string,
  blocks: readonly BlockVersion[],
): string => {
  const full = JSON.stringify({ blocks, spaceId, transactionId });
  if (Buffer.byteLength(full) < BLOCK_NOTIFY_PAYLOAD_LIMIT_BYTES) return full;
  return JSON.stringify({ spaceId, transactionId, truncated: true });
};
