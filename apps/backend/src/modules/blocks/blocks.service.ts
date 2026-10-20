import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@neuma/shared';
import {
  BLOCK_REPOSITORY,
  BLOCK_SUBTREE_MAX_BLOCKS,
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
    const synced = this.attachTextStates(blocks, result.textStates);
    return synced.isFail() ? Result.fail(synced.getError()) : Result.ok({ blocks: synced.getValue() });
  }

  private async syncChanged(requested: readonly RequestedBlock[], reader: BlockReader): Promise<BlockSyncResult> {
    const result = await this.blockRepository.readChanged(requested);
    if (result.isDepthExceeded) return Result.fail(new BlockTreeTooDeepError(BLOCK_TREE_MAX_DEPTH));
    const input = await this.buildInput(result, reader);
    const blocks = buildVisibleBlocks(input);
    const revoked = listRevokedBlockIds(
      input,
      requested.map((block) => block.id),
      blocks,
    );
    const synced = this.attachTextStates(blocks, result.textStates);
    return synced.isFail() ? Result.fail(synced.getError()) : Result.ok({ blocks: synced.getValue(), revoked });
  }

  /** Only the states of blocks the viewer can read count against the cap, so a hidden block weighs nothing. */
  private attachTextStates(
    blocks: readonly VisibleBlock[],
    textStates: ReadonlyMap<string, Uint8Array>,
  ): Result<SyncedBlock[], BlockSyncTextTooLargeError> {
    const states = blocks.map((block) => textStates.get(block.id) ?? null);
    const totalBytes = states.reduce((sum, state) => sum + (state?.byteLength ?? 0), 0);
    if (totalBytes > BLOCK_SYNC_MAX_TEXT_STATE_BYTES) {
      return Result.fail(new BlockSyncTextTooLargeError(BLOCK_SYNC_MAX_TEXT_STATE_BYTES));
    }
    return Result.ok(
      blocks.map((block, index) => {
        const state = states[index] ?? null;
        return { ...block, textState: state === null ? null : Buffer.from(state).toString('base64') };
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
