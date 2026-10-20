import { blockPlainTextSchema, canReadBlock, extractPlainText, resolveBlockRole } from '@neuma/shared';
import { BLOCK_ACCESS_TRASHED_LIFECYCLE } from '../constants/block-access.constants';
import type { BlockAccessChainRow, ReadableBlocksInput } from '../types/block-access.types';

const groupByCandidate = (
  rows: readonly BlockAccessChainRow[],
): ReadonlyMap<string, readonly BlockAccessChainRow[]> => {
  const chains = new Map<string, BlockAccessChainRow[]>();
  for (const row of rows) {
    const chain = chains.get(row.candidateId);
    if (chain === undefined) chains.set(row.candidateId, [row]);
    else chain.push(row);
  }
  return chains;
};

const isInTrashOrRemoved = (chain: readonly BlockAccessChainRow[]): boolean =>
  chain.some((row) => !row.alive || row.lifecycle === BLOCK_ACCESS_TRASHED_LIFECYCLE);

/**
 * A block is readable when it and every ancestor is alive and out of the trash, and the nearest block that declares
 * permissions grants the viewer a reading role. Rows come ordered from the candidate upwards.
 */
export const listReadableBlockIds = ({ readableSpaceIds, rows, viewer }: ReadableBlocksInput): ReadonlySet<string> => {
  const readable = new Set<string>();
  for (const [candidateId, chain] of groupByCandidate(rows)) {
    const candidate = chain.at(0);
    if (candidate === undefined || isInTrashOrRemoved(chain)) continue;
    const role = resolveBlockRole({
      canReadSpace: readableSpaceIds.has(candidate.spaceId),
      chain: chain.map((row) => ({ id: row.id, permissions: row.permissions })),
      viewer: { userId: viewer.userId, workspaceRole: viewer.role },
    });
    if (canReadBlock(role)) readable.add(candidateId);
  }
  return readable;
};

/** A page title is plain text under `properties.title`; anything else reads as an empty title. */
export const readBlockTitle = (properties: unknown): string => {
  if (typeof properties !== 'object' || properties === null || !('title' in properties)) return '';
  const title = blockPlainTextSchema.safeParse(properties.title);
  return title.success ? extractPlainText(title.data) : '';
};
