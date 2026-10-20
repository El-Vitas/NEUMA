import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@neuma/shared';
import { indexById, resolveRoles } from '../../common/domain/block-access.domain';
import { BLOCK_REPOSITORY, BLOCK_TREE_MAX_DEPTH } from './constants/blocks.constants';
import { BlockAccessDeniedError } from './domain/block.error';
import { isBlockReadableInPage, isPageReadable, toViewerAccess } from './domain/block.live.access.domain';
import type { LiveAccessContext } from './domain/block.live.domain.types';
import { BlockLiveRepository } from './infrastructure/persistence/block.live.repository';
import type { BlockChainReader, BlockLivePage, BlockLivePageAccess, RefreshedReaders } from './types/block.live.types';
import type { BlockReader, BlockRepositoryContract } from './types/blocks.types';

const listDistinctReaders = (readers: readonly BlockReader[]): BlockReader[] => [
  ...new Map(readers.map((reader) => [reader.userId, reader])).values(),
];

/** Decides who may read what on the live channel, with the same role rules as the page read. */
@Injectable()
export class BlockLiveAccessService implements BlockLivePageAccess {
  constructor(
    @Inject(BlockLiveRepository) private readonly chainReader: BlockChainReader,
    @Inject(BLOCK_REPOSITORY) private readonly blockRepository: BlockRepositoryContract,
  ) {}

  /** One statement for all the readers. Whoever is missing or inactive can no longer hold a socket. */
  async refreshReaders(readers: readonly BlockReader[]): Promise<RefreshedReaders> {
    const distinct = listDistinctReaders(readers);
    const accounts = await this.chainReader.readAccounts(distinct.map((reader) => reader.userId));
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const unavailable = distinct.filter((reader) => accountsById.get(reader.userId)?.isActive !== true);
    return {
      readers: distinct.flatMap((reader) => {
        const account = accountsById.get(reader.userId);
        return account?.isActive === true ? [{ ...reader, role: account.role }] : [];
      }),
      unavailableUserIds: new Set(unavailable.map((reader) => reader.userId)),
    };
  }

  /**
   * One statement reads the seeds and their ancestors; then one space lookup per distinct reader. That lookup is
   * the cost of never caching access: a revoked user stops receiving on the very next notification.
   */
  async loadContext(seedIds: readonly string[], readers: readonly BlockReader[]): Promise<LiveAccessContext> {
    const rows = await this.chainReader.readChains(seedIds);
    const rowsById = indexById(rows);
    const spaceIds = [...new Set(rows.map((row) => row.spaceId))];
    const rolesEntries = await Promise.all(
      listDistinctReaders(readers).map(async (reader) => {
        const readableSpaceIds = await this.blockRepository.findReadableSpaceIds(spaceIds, reader);
        const viewer = { userId: reader.userId, workspaceRole: reader.role };
        return [reader.userId, resolveRoles({ readableSpaceIds, viewer }, rowsById)] as const;
      }),
    );
    return { maxDepth: BLOCK_TREE_MAX_DEPTH, rolesByUserId: new Map(rolesEntries), rowsById };
  }

  async resolvePageAccess(reader: BlockReader, pageId: string): Promise<Result<BlockLivePage, BlockAccessDeniedError>> {
    const context = await this.loadContext([pageId], [reader]);
    const access = toViewerAccess(context, reader.userId);
    const page = context.rowsById.get(pageId);
    if (access === undefined || page === undefined || !isPageReadable(pageId, access)) {
      return Result.fail(new BlockAccessDeniedError());
    }
    return Result.ok({ spaceId: page.spaceId });
  }

  async canReadBlockInPage(reader: BlockReader, pageId: string, blockId: string): Promise<boolean> {
    const context = await this.loadContext([pageId, blockId], [reader]);
    const access = toViewerAccess(context, reader.userId);
    return access !== undefined && isPageReadable(pageId, access) && isBlockReadableInPage(blockId, pageId, access);
  }
}
