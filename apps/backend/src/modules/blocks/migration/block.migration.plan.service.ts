import { Injectable } from '@nestjs/common';
import { Result } from '@neuma/shared';
import type { Logger } from 'pino';
import { BLOCK_SUBTREE_MAX_BLOCKS } from '../constants/blocks.constants';
import { BlockMigrationBatchesService } from './block.migration.batches.service';
import { convertPage } from './domain/block.migration.conversion.domain';
import { buildMigrationHierarchy } from './domain/block.migration.hierarchy.domain';
import {
  countBlocksOfRead,
  createInspectionTotals,
  describeOversizedPage,
  inspectPage,
  listTakenBlockIds,
} from './domain/block.migration.inspection.domain';
import { claimBlockIds, createBlockRegistry, groupRemapsByPage } from './domain/block.migration.remap.domain';
import { BlockMigrationRepository } from './infrastructure/persistence/block.migration.repository';
import type {
  BlockIdRemap,
  BlockIdRemapsByPage,
  BlockMigrationProblem,
  InspectionLimits,
  InspectionTotals,
  MigrationHierarchy,
  MigrationPageRow,
  MigrationPlan,
  PageBatch,
  RemapCollection,
} from './types/block.migration.types';
import { readCheckedPage } from './utils/block.migration.page.utils';

/**
 * Looks at the whole database without writing: which block ids are shared between pages and get new ones, which
 * pages cannot be converted or do not give their document back, and how many pages, blocks and links there are.
 */
@Injectable()
export class BlockMigrationPlanService {
  constructor(
    private readonly repository: BlockMigrationRepository,
    private readonly batches: BlockMigrationBatchesService,
  ) {}

  /** `maxPageBlocks` is the most blocks one sync read hands out; a page above it could no longer be opened. */
  async plan(logger: Logger, maxPageBlocks: number = BLOCK_SUBTREE_MAX_BLOCKS): Promise<MigrationPlan> {
    const nodes = await this.repository.listPageNodes();
    const hierarchy = buildMigrationHierarchy(nodes);
    const pageIds = nodes.map((node) => node.id);
    const collection = await this.collectRemaps(hierarchy, pageIds, logger);
    const remapsByPage = groupRemapsByPage(collection.remaps);
    const inspected = await this.inspectPages(hierarchy, pageIds, remapsByPage, collection, logger, maxPageBlocks);
    const problems = [...hierarchy.problems, ...collection.problems, ...inspected.problems];
    return {
      hierarchy,
      remapsByPage,
      report: {
        alreadyMigratedPageCount: inspected.alreadyMigratedPageCount,
        blockCount: inspected.blockCount,
        danglingLinkCount: inspected.danglingLinkCount,
        isClean: problems.length === 0,
        linkCount: inspected.linkCount,
        pageCount: nodes.length,
        problems,
        remaps: collection.remaps,
      },
    };
  }

  /** First pass: converts each page as it is stored and gives a new id to every block id another page owns. */
  private async collectRemaps(
    hierarchy: MigrationHierarchy,
    pageIds: readonly string[],
    logger: Logger,
  ): Promise<RemapCollection> {
    const registry = createBlockRegistry(pageIds);
    const remaps: BlockIdRemap[] = [];
    const problems: BlockMigrationProblem[] = [];
    const failedPageIds = new Set<string>();
    await this.batches.visit(hierarchy.spaces, logger, (batch) => {
      for (const row of batch.rows) {
        const outcome = this.listOwnBlockIds(row);
        if (outcome.isFail()) {
          failedPageIds.add(row.id);
          problems.push(...outcome.getError());
          continue;
        }
        remaps.push(...claimBlockIds(registry, row.id, outcome.getValue()));
      }
      return Promise.resolve();
    });
    return { failedPageIds, problems, remaps };
  }

  private listOwnBlockIds(row: MigrationPageRow): Result<string[], readonly BlockMigrationProblem[]> {
    const page = readCheckedPage(row);
    if (page.isFail()) return Result.fail(page.getError());
    const converted = convertPage(page.getValue(), new Map());
    if (converted.isFail()) return Result.fail([converted.getError()]);
    return Result.ok(converted.getValue().tree.blocks.map((block) => block.id));
  }

  /** Second pass: converts each page with its new ids, checks it round trips and counts what it holds. */
  private async inspectPages(
    hierarchy: MigrationHierarchy,
    pageIds: readonly string[],
    remapsByPage: BlockIdRemapsByPage,
    collection: RemapCollection,
    logger: Logger,
    maxPageBlocks: number,
  ): Promise<InspectionTotals> {
    const owners = createBlockRegistry(pageIds);
    const totals = createInspectionTotals();
    const limits = { childPageIdsByParent: hierarchy.childPageIdsByParent, maxPageBlocks };
    await this.batches.visit(hierarchy.spaces, logger, async (batch) => {
      await this.inspectBatch(batch, remapsByPage, collection.failedPageIds, owners, totals, limits);
    });
    totals.danglingLinkCount = await this.countDanglingLinks(totals.targetCounts, owners);
    return totals;
  }

  private async inspectBatch(
    batch: PageBatch,
    remapsByPage: BlockIdRemapsByPage,
    failedPageIds: ReadonlySet<string>,
    owners: Map<string, string>,
    totals: InspectionTotals,
    limits: InspectionLimits,
  ): Promise<void> {
    const readable = batch.rows.filter((row) => !failedPageIds.has(row.id));
    const inspected = readable.flatMap((row) => {
      const page = readCheckedPage(row);
      return page.isFail() ? [] : [{ inspection: inspectPage(page.getValue(), remapsByPage, owners), pageId: row.id }];
    });
    const existing = await this.repository.findExistingBlockIds([
      ...batch.pageIds,
      ...inspected.flatMap((entry) => entry.inspection.blockIds),
    ]);
    for (const { inspection, pageId } of inspected) {
      totals.problems.push(...inspection.problems);
      totals.blockCount += inspection.blockIds.length;
      totals.linkCount += inspection.linkTargetIds.length;
      for (const targetId of inspection.linkTargetIds) {
        totals.targetCounts.set(targetId, (totals.targetCounts.get(targetId) ?? 0) + 1);
      }
      const readCount = countBlocksOfRead(inspection.blockIds.length, limits.childPageIdsByParent.get(pageId));
      if (readCount > limits.maxPageBlocks)
        totals.problems.push(describeOversizedPage(pageId, readCount, limits.maxPageBlocks));
      if (existing.has(pageId)) totals.alreadyMigratedPageCount += 1;
      else totals.problems.push(...listTakenBlockIds(pageId, inspection.blockIds, existing));
    }
  }

  private async countDanglingLinks(
    targetCounts: ReadonlyMap<string, number>,
    owners: ReadonlyMap<string, string>,
  ): Promise<number> {
    const unknownTargets = [...targetCounts.keys()].filter((targetId) => !owners.has(targetId));
    const existing = await this.repository.findExistingBlockIds(unknownTargets);
    return unknownTargets
      .filter((targetId) => !existing.has(targetId))
      .reduce((total, targetId) => total + (targetCounts.get(targetId) ?? 0), 0);
  }
}
