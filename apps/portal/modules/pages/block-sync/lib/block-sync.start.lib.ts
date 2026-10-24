import type { Result } from '@neuma/shared';
import type { PageSummary } from '../../types/pages.types';
import { BLOCK_SYNC_FAILED_START } from '../constants/block-sync.constants';
import type { BlockEditorStart, BlockSnapshot, SyncedBlock } from '../types/block-sync.types';
import { buildContentFromSnapshots } from './block-sync.rows.lib';

const toSnapshotMap = (blocks: readonly SyncedBlock[]): ReadonlyMap<string, BlockSnapshot> =>
  new Map(blocks.filter((block) => block.alive).map((block) => [block.id, block]));

/** The page holding the document the blocks say; untouched when there is none. */
export const withBlockEditorContent = (page: PageSummary, start: BlockEditorStart): PageSummary =>
  start.content === null ? page : { ...page, content: start.content };

/**
 * What the block editor starts from, read on the server: the blocks and the document they say. Any failure,
 * in the read or in turning the blocks into a document, is a failed start, never a quiet fallback to stored content.
 */
export const resolveBlockEditorStart = (
  blocksResult: Result<readonly SyncedBlock[], Error> | null,
  pageId: string,
): BlockEditorStart => {
  if (blocksResult === null) return { blocks: null, content: null, isFailed: false };
  if (blocksResult.isFail()) return BLOCK_SYNC_FAILED_START;
  const blocks = blocksResult.getValue();
  const content = buildContentFromSnapshots(toSnapshotMap(blocks), pageId);
  return content.isFail() ? BLOCK_SYNC_FAILED_START : { blocks, content: content.getValue(), isFailed: false };
};
