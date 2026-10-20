import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';
import { BLOCK_MIGRATION_PAGE_BATCH_SIZE } from './constants/block.migration.constants';
import { BlockMigrationRepository } from './infrastructure/persistence/block.migration.repository';
import type { MigrationPageRow, PageBatch, SpaceTree } from './types/block.migration.types';
import { splitIntoChunks } from './utils/block.migration.chunk.utils';

/** Walks the pages space by space in fixed batches, a parent always before its children. */
@Injectable()
export class BlockMigrationBatchesService {
  constructor(private readonly repository: BlockMigrationRepository) {}

  async visit(
    spaces: readonly SpaceTree[],
    logger: Logger,
    visitor: (batch: PageBatch) => Promise<void>,
  ): Promise<void> {
    for (const space of spaces) {
      let visitedCount = 0;
      for (const pageIds of splitIntoChunks(space.orderedPageIds, BLOCK_MIGRATION_PAGE_BATCH_SIZE)) {
        const rows = await this.repository.readPages(pageIds);
        await visitor({ pageIds, rows: sortLikeIds(rows, pageIds), spaceId: space.spaceId });
        visitedCount += pageIds.length;
      }
      logger.info({ pageCount: visitedCount, spaceId: space.spaceId }, 'Space visited');
    }
  }
}

const sortLikeIds = (rows: readonly MigrationPageRow[], pageIds: readonly string[]): MigrationPageRow[] => {
  const positions = new Map(pageIds.map((pageId, position) => [pageId, position]));
  return rows.toSorted((first, second) => (positions.get(first.id) ?? 0) - (positions.get(second.id) ?? 0));
};
