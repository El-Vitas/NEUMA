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
   * One statement reads the seeds and their ancestors, and two more read the spaces of all the distinct readers
   * together, those of the blocks and the ones a follower follows: a page that left a space leaves none of its rows
   * there, yet the people following that space must still be told. Nothing is cached: a revoked user stops
   * receiving on the very next notification, and the cost of a commit does not grow with the people connected.
   */
  async loadContext(
    seedIds: readonly string[],
    readers: readonly BlockReader[],
    followedSpaceIds: readonly string[] = [],
  ): Promise<LiveAccessContext> {
    const rows = await this.chainReader.readChains(seedIds);
    const rowsById = indexById(rows);
    const spaceIds = [...new Set([...rows.map((row) => row.spaceId), ...followedSpaceIds])];
    const distinctReaders = listDistinctReaders(readers);
    const readableByUser = await this.blockRepository.findReadableSpaceIdsByReader(spaceIds, distinctReaders);
    const entries = distinctReaders.map((reader) => {
      const readableSpaceIds = readableByUser.get(reader.userId) ?? new Set<string>();
      const viewer = { userId: reader.userId, workspaceRole: reader.role };
      return { readableSpaceIds, roles: resolveRoles({ readableSpaceIds, viewer }, rowsById), userId: reader.userId };
    });
    return {
      maxDepth: BLOCK_TREE_MAX_DEPTH,
      readableSpaceIdsByUserId: new Map(entries.map((entry) => [entry.userId, entry.readableSpaceIds])),
      rolesByUserId: new Map(entries.map((entry) => [entry.userId, entry.roles])),
      rowsById,
    };
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

  async canReadSpace(reader: BlockReader, spaceId: string): Promise<boolean> {
    const readable = await this.blockRepository.findReadableSpaceIds([spaceId], reader);
    return readable.has(spaceId);
  }

  hasPageChangesSince(spaceId: string, since: string): Promise<boolean> {
    return this.chainReader.hasPageChangesSince(spaceId, since);
  }

  async canReadBlockInPage(reader: BlockReader, pageId: string, blockId: string): Promise<boolean> {
    const context = await this.loadContext([pageId, blockId], [reader]);
    const access = toViewerAccess(context, reader.userId);
    return access !== undefined && isPageReadable(pageId, access) && isBlockReadableInPage(blockId, pageId, access);
  }
}
