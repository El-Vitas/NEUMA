import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';
import type { BlockLinkDraft } from '../domain/block.transaction.domain.types';
import { blockTextEngine } from '../utils/block.text.utils';
import { BlockMigrationBatchesService } from './block.migration.batches.service';
import { BlockMigrationPlanService } from './block.migration.plan.service';
import {
  compareLinks,
  comparePageWithStoredBlocks,
  groupLinksByPage,
} from './domain/block.migration.comparison.domain';
import { buildMigratedPage, convertPage, listPageLinkDrafts } from './domain/block.migration.conversion.domain';
import { BlockMigrationRepository } from './infrastructure/persistence/block.migration.repository';
import type {
  BlockMigrationApplyReport,
  BlockMigrationCheckReport,
  BlockMigrationProblem,
  BlockMigrationVerifyReport,
  MigratedPage,
  MigrationPlan,
  PageBatch,
  StoredPageBlocks,
  VerifyTotals,
  WriteTotals,
} from './types/block.migration.types';
import { readCheckedPage } from './utils/block.migration.page.utils';
import { findTextStateDrift } from './utils/block.migration.text.utils';

/**
 * Moves every `Page` and its `Page.content` into `Block` rows. `Page` and its content are never touched: the old
 * model stays until it is retired. Every mode reads the whole database through the same plan.
 */
@Injectable()
export class BlockMigrationService {
  constructor(
    private readonly repository: BlockMigrationRepository,
    private readonly plans: BlockMigrationPlanService,
    private readonly batches: BlockMigrationBatchesService,
  ) {}

  async check(logger: Logger, maxPageBlocks?: number): Promise<BlockMigrationCheckReport> {
    const plan = await this.plans.plan(logger, maxPageBlocks);
    return plan.report;
  }

  /** Writes nothing unless the check of the same run passes; ends by reading every page back. */
  async apply(logger: Logger): Promise<BlockMigrationApplyReport> {
    const plan = await this.plans.plan(logger);
    if (!plan.report.isClean) {
      logger.error({ problemCount: plan.report.problems.length }, 'The check found problems: nothing was written');
      return this.buildRefusal(plan.report);
    }
    const written = await this.writePages(plan, logger);
    if (written.problems.length > 0) {
      logger.error({ problemCount: written.problems.length }, 'A page could not be converted: the run stopped');
      return { ...this.buildRefusal(plan.report), problems: written.problems };
    }
    const insertedLinkCount = await this.writeLinks(plan, logger);
    const verify = await this.verifyPlan(plan, logger);
    return {
      check: plan.report,
      insertedBlockCount: written.insertedBlockCount,
      insertedLinkCount,
      isApplied: verify.isClean,
      migratedPageCount: written.migratedPageCount,
      problems: [],
      skippedPageCount: written.skippedPageCount,
      verify,
    };
  }

  async verify(logger: Logger): Promise<BlockMigrationVerifyReport> {
    const plan = await this.plans.plan(logger);
    const verified = await this.verifyPlan(plan, logger);
    const problems = [...plan.report.problems, ...verified.problems];
    return { ...verified, isClean: problems.length === 0, problems };
  }

  private buildRefusal(check: BlockMigrationCheckReport): BlockMigrationApplyReport {
    return {
      check,
      insertedBlockCount: 0,
      insertedLinkCount: 0,
      isApplied: false,
      migratedPageCount: 0,
      problems: [],
      skippedPageCount: 0,
      verify: null,
    };
  }

  private async writePages(plan: MigrationPlan, logger: Logger): Promise<WriteTotals> {
    const totals: WriteTotals = { insertedBlockCount: 0, migratedPageCount: 0, problems: [], skippedPageCount: 0 };
    await this.batches.visit(plan.hierarchy.spaces, logger, async (batch) => {
      if (totals.problems.length > 0) return;
      await this.writeBatch(batch, plan, totals);
    });
    logger.info(
      { migratedPageCount: totals.migratedPageCount, skippedPageCount: totals.skippedPageCount },
      'Pages written',
    );
    return totals;
  }

  private async writeBatch(batch: PageBatch, plan: MigrationPlan, totals: WriteTotals): Promise<void> {
    const existing = await this.repository.findExistingBlockIds(batch.pageIds);
    const pending = batch.rows.filter((row) => !existing.has(row.id));
    totals.skippedPageCount += batch.rows.length - pending.length;
    const migrated: MigratedPage[] = [];
    for (const row of pending) {
      const page = readCheckedPage(row);
      if (page.isFail()) {
        totals.problems.push(...page.getError());
        continue;
      }
      const converted = convertPage(page.getValue(), plan.remapsByPage);
      if (converted.isFail()) {
        totals.problems.push(converted.getError());
        continue;
      }
      const childPageIds = plan.hierarchy.childPageIdsByParent.get(row.id) ?? [];
      const built = buildMigratedPage(page.getValue(), converted.getValue(), childPageIds, blockTextEngine);
      if (built.isFail()) totals.problems.push(built.getError());
      else migrated.push(built.getValue());
    }
    if (totals.problems.length > 0 || migrated.length === 0) return;
    totals.insertedBlockCount += await this.repository.insertPages(migrated);
    totals.migratedPageCount += migrated.length;
  }

  /** Links go in after every block exists, because a link can point at a page of another space or a later page. */
  private async writeLinks(plan: MigrationPlan, logger: Logger): Promise<number> {
    let insertedCount = 0;
    await this.batches.visit(plan.hierarchy.spaces, logger, async (batch) => {
      const links = this.listBatchLinks(batch, plan);
      const existing = await this.repository.findExistingBlockIds(links.map((link) => link.targetBlockId));
      insertedCount += await this.repository.insertLinks(links.filter((link) => existing.has(link.targetBlockId)));
    });
    logger.info({ insertedLinkCount: insertedCount }, 'Links written');
    return insertedCount;
  }

  private listBatchLinks(batch: PageBatch, plan: MigrationPlan): BlockLinkDraft[] {
    return batch.rows.flatMap((row) => {
      const page = readCheckedPage(row);
      if (page.isFail()) return [];
      const converted = convertPage(page.getValue(), plan.remapsByPage);
      return converted.isFail() ? [] : listPageLinkDrafts(page.getValue(), converted.getValue().tree);
    });
  }

  private async verifyPlan(plan: MigrationPlan, logger: Logger): Promise<BlockMigrationVerifyReport> {
    const totals: VerifyTotals = { blockCount: 0, linkCount: 0, pageCount: 0, problems: [] };
    await this.batches.visit(plan.hierarchy.spaces, logger, async (batch) => {
      await this.verifyBatch(batch, plan, totals);
    });
    logger.info({ problemCount: totals.problems.length }, 'Pages verified');
    return { ...totals, isClean: totals.problems.length === 0 };
  }

  private async verifyBatch(batch: PageBatch, plan: MigrationPlan, totals: VerifyTotals): Promise<void> {
    const stored = await this.repository.readStoredPages(batch.pageIds);
    const storedLinks = groupLinksByPage(await this.repository.readStoredLinks(batch.pageIds));
    for (const row of batch.rows) {
      const page = readCheckedPage(row);
      const converted = page.isOk() ? convertPage(page.getValue(), plan.remapsByPage) : null;
      if (page.isFail() || converted === null || converted.isFail()) continue;
      const childPageIds = plan.hierarchy.childPageIdsByParent.get(row.id) ?? [];
      const expected = buildMigratedPage(page.getValue(), converted.getValue(), childPageIds, blockTextEngine);
      if (expected.isFail()) {
        totals.problems.push(expected.getError());
        continue;
      }
      const storedPage = stored.get(row.id) ?? null;
      const links = storedLinks.get(row.id) ?? [];
      totals.pageCount += 1;
      totals.blockCount += storedPage?.blocks.length ?? 0;
      totals.linkCount += links.length;
      totals.problems.push(
        ...comparePageWithStoredBlocks(page.getValue(), converted.getValue(), expected.getValue(), storedPage),
        ...this.listTextDrift(storedPage),
        ...(await this.compareStoredLinks(row.id, expected.getValue().links, links)),
      );
    }
  }

  private listTextDrift(stored: StoredPageBlocks | null): BlockMigrationProblem[] {
    return stored === null ? [] : [stored.page, ...stored.blocks].flatMap(findTextStateDrift);
  }

  /** A link whose target is not stored is left out when the migration writes, so it is left out here too. */
  private async compareStoredLinks(
    pageId: string,
    expected: readonly BlockLinkDraft[],
    stored: readonly BlockLinkDraft[],
  ): Promise<BlockMigrationProblem[]> {
    const existing = await this.repository.findExistingBlockIds(expected.map((link) => link.targetBlockId));
    return compareLinks(
      pageId,
      expected.filter((link) => existing.has(link.targetBlockId)),
      stored,
    );
  }
}
