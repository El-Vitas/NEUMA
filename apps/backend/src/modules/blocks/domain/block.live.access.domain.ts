import { BLOCK_TYPE, canReadBlock } from '@neuma/shared';
import type { BlockChainRow, LiveAccessContext, ViewerAccess } from './block.live.domain.types';
import { walkChain } from './block.tree.domain';

export const toViewerAccess = (context: LiveAccessContext, userId: string): ViewerAccess | undefined => {
  const rolesById = context.rolesByUserId.get(userId);
  return rolesById === undefined ? undefined : { maxDepth: context.maxDepth, rolesById, rowsById: context.rowsById };
};

const isRowReadable = (row: BlockChainRow, access: ViewerAccess): boolean => {
  const role = access.rolesById.get(row.id);
  return role !== undefined && canReadBlock(role);
};

/** A page is read through its own role, and only while it exists. */
export const isPageReadable = (pageId: string, access: ViewerAccess): boolean => {
  const page = access.rowsById.get(pageId);
  return page?.alive === true && page.type === BLOCK_TYPE.page && isRowReadable(page, access);
};

/**
 * A block belongs to the nearest page above it. The viewer reads it when the block and every ancestor up to that
 * page are readable, the same cut the page read makes, so the channel never names a block the read would not return.
 */
export const isBlockReadableInPage = (blockId: string, pageId: string, access: ViewerAccess): boolean => {
  const chain = walkChain(blockId, access.rowsById, access.maxDepth);
  const pageIndex = chain.findIndex((row) => row.type === BLOCK_TYPE.page);
  if (chain[pageIndex]?.id !== pageId) return false;
  return chain.slice(0, pageIndex + 1).every((row) => isRowReadable(row, access));
};
