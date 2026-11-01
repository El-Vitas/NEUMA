import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@neuma/shared';
import {
  BLOCK_REPOSITORY,
  BLOCK_SUBTREE_MAX_BLOCKS,
  BLOCK_SYNC_MAX_ROWS,
  BLOCK_SYNC_MAX_TEXT_STATE_BYTES,
  BLOCK_TREE_MAX_DEPTH,
} from './constants/blocks.constants';
import { buildVisibleBlocks, listRevokedBlockIds } from './domain/block.domain';
import type { BlockRows, VisibleBlock, VisibleBlocksInput } from './domain/block.domain.types';
import {
  BlockAccessDeniedError,
  BlockSubtreeTooLargeError,
  BlockSyncTextTooLargeError,
  BlockTreeTooDeepError,
} from './domain/block.error';
import type {
  BlockReader,
  BlockRepositoryContract,
  BlockSyncRequest,
  BlockSyncResult,
  RequestedBlock,
  SyncedBlock,
} from './types/blocks.types';

@Injectable()
export class BlocksService {
  constructor(@Inject(BLOCK_REPOSITORY) private readonly blockRepository: BlockRepositoryContract) {}

  async sync(request: BlockSyncRequest, reader: BlockReader): Promise<BlockSyncResult> {
    if (request.kind === 'page') return this.syncPage(request.pageId, reader);
    return this.syncChanged(request.blocks, reader);
  }

  private async syncPage(pageId: string, reader: BlockReader): Promise<BlockSyncResult> {
    const result = await this.blockRepository.readSubtree(pageId);
    const blocks = buildVisibleBlocks(await this.buildInput(result, reader));
    if (!blocks.some((block) => block.id === pageId)) return Result.fail(new BlockAccessDeniedError());
    if (result.isDepthExceeded) return Result.fail(new BlockTreeTooDeepError(BLOCK_TREE_MAX_DEPTH));
    if (result.targets.length > BLOCK_SUBTREE_MAX_BLOCKS) {
      return Result.fail(new BlockSubtreeTooLargeError(BLOCK_SUBTREE_MAX_BLOCKS));
    }
    const synced = await this.attachTextStates(blocks, result.textStateBytes);
    return synced.isFail() ? Result.fail(synced.getError()) : Result.ok({ blocks: synced.getValue() });
  }

  private async syncChanged(requested: readonly RequestedBlock[], reader: BlockReader): Promise<BlockSyncResult> {
    const result = await this.blockRepository.readChanged(requested);
    if (result.isDepthExceeded) return Result.fail(new BlockTreeTooDeepError(BLOCK_TREE_MAX_DEPTH));
    if (result.targets.length + result.context.length > BLOCK_SYNC_MAX_ROWS) {
      return Result.fail(new BlockSubtreeTooLargeError(BLOCK_SYNC_MAX_ROWS));
    }
    const input = await this.buildInput(result, reader);
    const blocks = buildVisibleBlocks(input);
    const revoked = listRevokedBlockIds(
      input,
      requested.map((block) => block.id),
      blocks,
    );
    const synced = await this.attachTextStates(blocks, result.textStateBytes);
    return synced.isFail() ? Result.fail(synced.getError()) : Result.ok({ blocks: synced.getValue(), revoked });
  }

  /**
   * Only the states of blocks the viewer can read count against the cap, so a hidden block weighs nothing. The cap is
   * judged on sizes alone: no state is read from the database until the readable ones are known to fit.
   */
  private async attachTextStates(
    blocks: readonly VisibleBlock[],
    textStateBytes: ReadonlyMap<string, number>,
  ): Promise<Result<SyncedBlock[], BlockSyncTextTooLargeError>> {
    const totalBytes = blocks.reduce((sum, block) => sum + (textStateBytes.get(block.id) ?? 0), 0);
    if (totalBytes > BLOCK_SYNC_MAX_TEXT_STATE_BYTES) {
      return Result.fail(new BlockSyncTextTooLargeError(BLOCK_SYNC_MAX_TEXT_STATE_BYTES));
    }
    const withState = blocks.filter((block) => textStateBytes.has(block.id)).map((block) => block.id);
    const states =
      withState.length === 0 ? new Map<string, Uint8Array>() : await this.blockRepository.readTextStates(withState);
    return Result.ok(
      blocks.map((block) => {
        const state = states.get(block.id);
        return { ...block, textState: state === undefined ? null : Buffer.from(state).toString('base64') };
      }),
    );
  }

  private async buildInput(rows: BlockRows, reader: BlockReader): Promise<VisibleBlocksInput> {
    const spaceIds = [...new Set([...rows.targets, ...rows.context].map((record) => record.spaceId))];
    const readableSpaceIds = await this.blockRepository.findReadableSpaceIds(spaceIds, reader);
    return {
      readableSpaceIds,
      rows: { context: rows.context, targets: rows.targets },
      viewer: { userId: reader.userId, workspaceRole: reader.role },
    };
  }
}
